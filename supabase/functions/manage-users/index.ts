import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const USERNAME_EMAIL_DOMAIN = 'retiro2027.app';
const VALID_ROLES = ['admin', 'coordinator', 'viewer'] as const;
type UserRole = (typeof VALID_ROLES)[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeUsername(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');
}

function isValidUsername(username: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(username);
}

function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && (VALID_ROLES as readonly string[]).includes(role);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Configuração do servidor Supabase incompleta.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401);
  }

  const callerId = authData.user.id;
  const { data: callerProfile, error: profileError } = await adminClient
    .from('users')
    .select('id, role')
    .eq('id', callerId)
    .maybeSingle();

  if (profileError || !callerProfile) {
    return jsonResponse({ error: 'Perfil do usuário não encontrado.' }, 403);
  }

  const callerRole = callerProfile.role as UserRole;
  if (callerRole !== 'admin' && callerRole !== 'coordinator') {
    return jsonResponse(
      { error: 'Supervisores possuem acesso somente leitura e não podem gerenciar contas.' },
      403
    );
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? '');

  if (action === 'list') {
    const { data, error } = await adminClient
      .from('users')
      .select('id, name, username, email, role, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      return jsonResponse({ error: 'Erro ao carregar a lista de contas.' }, 500);
    }
    return jsonResponse({ users: data ?? [] });
  }

  if (action === 'create') {
    const name = String(body?.name ?? '').trim();
    const username = normalizeUsername(body?.username);
    const password = String(body?.password ?? '');
    const role = body?.role;

    if (name.length < 2) {
      return jsonResponse({ error: 'Informe o nome completo (mínimo 2 caracteres).' }, 400);
    }
    if (!isValidUsername(username)) {
      return jsonResponse(
        { error: 'Nome de usuário inválido. Use 3 a 32 letras/números (pode conter . _ -).' },
        400
      );
    }
    if (password.length < 6) {
      return jsonResponse({ error: 'A senha inicial deve ter pelo menos 6 caracteres.' }, 400);
    }
    if (!isValidRole(role)) {
      return jsonResponse({ error: 'Nível de acesso inválido.' }, 400);
    }

    if (callerRole === 'coordinator' && role === 'admin') {
      return jsonResponse(
        { error: 'Apenas administradores podem criar contas de Administrador.' },
        403
      );
    }

    const { data: existingUsername } = await adminClient
      .from('users')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (existingUsername) {
      return jsonResponse({ error: `O usuário "${username}" já está em uso.` }, 409);
    }

    const internalEmail = `${username}@${USERNAME_EMAIL_DOMAIN}`;
    const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: { name, username },
    });

    if (createAuthError || !createdAuth.user) {
      const msg = createAuthError?.message?.toLowerCase().includes('already')
        ? `O usuário "${username}" já está cadastrado.`
        : createAuthError?.message || 'Não foi possível criar a conta no Auth.';
      return jsonResponse({ error: msg }, 400);
    }

    const newUserId = createdAuth.user.id;
    const { data: insertedProfile, error: insertError } = await adminClient
      .from('users')
      .insert({
        id: newUserId,
        name,
        username,
        email: internalEmail,
        role,
      })
      .select('id, name, username, email, role, created_at')
      .single();

    if (insertError) {
      await adminClient.auth.admin.deleteUser(newUserId).catch(() => {});
      return jsonResponse({ error: 'Falha ao salvar perfil do usuário no banco.' }, 500);
    }

    await adminClient.from('audit_logs').insert({
      actor_id: callerId,
      actor_role: callerRole,
      action: 'INSERT',
      table_name: 'users',
      record_id: newUserId,
      summary: { role, username },
    });

    return jsonResponse({ user: insertedProfile }, 201);
  }

  if (action === 'update') {
    const userId = String(body?.userId ?? '').trim();
    const name = body?.name !== undefined ? String(body.name).trim() : undefined;
    const nextRole = body?.role;
    const password = body?.password !== undefined ? String(body.password) : undefined;

    if (!userId) {
      return jsonResponse({ error: 'ID do usuário é obrigatório.' }, 400);
    }
    if (userId === callerId) {
      return jsonResponse(
        { error: 'Use a página Perfil para alterar sua própria senha.' },
        400
      );
    }

    const { data: targetUser, error: targetError } = await adminClient
      .from('users')
      .select('id, name, username, email, role')
      .eq('id', userId)
      .maybeSingle();

    if (targetError || !targetUser) {
      return jsonResponse({ error: 'Conta não encontrada.' }, 404);
    }

    const targetRole = targetUser.role as UserRole;
    if (callerRole === 'coordinator') {
      if (targetRole === 'admin') {
        return jsonResponse(
          { error: 'Apenas administradores podem alterar contas de Administrador.' },
          403
        );
      }
      if (nextRole !== undefined) {
        if (!isValidRole(nextRole) || nextRole === 'admin') {
          return jsonResponse(
            { error: 'Coordenadores não podem atribuir nível Administrador.' },
            403
          );
        }
        if (targetRole === 'coordinator' && nextRole !== 'coordinator') {
          return jsonResponse(
            { error: 'Apenas administradores podem alterar ou rebaixar outro Coordenador.' },
            403
          );
        }
      }
    } else if (nextRole !== undefined && !isValidRole(nextRole)) {
      return jsonResponse({ error: 'Nível de acesso inválido.' }, 400);
    }

    if (name !== undefined && name.length < 2) {
      return jsonResponse({ error: 'O nome deve ter pelo menos 2 caracteres.' }, 400);
    }
    if (password !== undefined && password.length > 0 && password.length < 6) {
      return jsonResponse({ error: 'A nova senha deve ter pelo menos 6 caracteres.' }, 400);
    }

    const authUpdates: { password?: string; user_metadata?: Record<string, unknown> } = {};
    if (password && password.length >= 6) authUpdates.password = password;
    if (name !== undefined) {
      authUpdates.user_metadata = { name, username: targetUser.username };
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authUpdateErr } = await adminClient.auth.admin.updateUserById(
        userId,
        authUpdates
      );
      if (authUpdateErr) {
        return jsonResponse({ error: 'Não foi possível atualizar credenciais no Auth.' }, 500);
      }
    }

    const profileUpdates: { name?: string; role?: UserRole } = {};
    if (name !== undefined) profileUpdates.name = name;
    if (nextRole !== undefined) profileUpdates.role = nextRole;

    let updatedProfile = targetUser;
    if (Object.keys(profileUpdates).length > 0) {
      const { data, error: profUpdateErr } = await adminClient
        .from('users')
        .update(profileUpdates)
        .eq('id', userId)
        .select('id, name, username, email, role, created_at')
        .single();

      if (profUpdateErr || !data) {
        return jsonResponse({ error: 'Falha ao atualizar perfil no banco.' }, 500);
      }
      updatedProfile = data;
    }

    await adminClient.from('audit_logs').insert({
      actor_id: callerId,
      actor_role: callerRole,
      action: 'UPDATE',
      table_name: 'users',
      record_id: userId,
      summary: {
        role: updatedProfile.role,
        password_reset: Boolean(password && password.length >= 6),
      },
    });

    return jsonResponse({ user: updatedProfile });
  }

  if (action === 'delete') {
    const userId = String(body?.userId ?? '').trim();
    if (!userId) {
      return jsonResponse({ error: 'ID do usuário é obrigatório.' }, 400);
    }
    if (userId === callerId) {
      return jsonResponse({ error: 'Você não pode excluir sua própria conta.' }, 400);
    }

    const { data: targetUser, error: targetError } = await adminClient
      .from('users')
      .select('id, username, role')
      .eq('id', userId)
      .maybeSingle();

    if (targetError || !targetUser) {
      return jsonResponse({ error: 'Conta não encontrada.' }, 404);
    }

    const targetRole = targetUser.role as UserRole;
    if (callerRole === 'coordinator' && targetRole !== 'viewer') {
      return jsonResponse(
        { error: 'Apenas administradores podem excluir contas de Coordenador ou Administrador.' },
        403
      );
    }

    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return jsonResponse({ error: 'Não foi possível excluir o usuário.' }, 500);
    }

    // Garante remoção em public.users caso não haja cascade ativo
    await adminClient.from('users').delete().eq('id', userId);

    await adminClient.from('audit_logs').insert({
      actor_id: callerId,
      actor_role: callerRole,
      action: 'DELETE',
      table_name: 'users',
      record_id: userId,
      summary: { target_role: targetRole, username: targetUser.username },
    });

    return jsonResponse({ deleted: true });
  }

  return jsonResponse({ error: 'Ação não suportada.' }, 400);
});

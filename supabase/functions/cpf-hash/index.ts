import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizeCpf(value: unknown): string {
  return String(value ?? '').replace(/\D+/g, '');
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const pepper = Deno.env.get('CPF_HMAC_PEPPER');

  if (!supabaseUrl || !supabaseAnonKey || !pepper) {
    return new Response(
      JSON.stringify({ error: 'Configuração de segurança CPF_HMAC_PEPPER ausente no servidor.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile } = await client
    .from('users')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!profile || !['admin', 'coordinator'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'Permissão insuficiente para importar dados.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => ({}));
  const cpfs = Array.isArray(body?.cpfs) ? body.cpfs : [];

  const hashes = await Promise.all(
    cpfs.map(async (raw: unknown) => {
      const digits = normalizeCpf(raw);
      if (digits.length !== 11) return null;
      return hmacSha256Hex(pepper, digits);
    })
  );

  return new Response(JSON.stringify({ hashes }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

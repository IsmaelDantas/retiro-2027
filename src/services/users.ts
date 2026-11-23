import { supabase } from '../lib/supabase';
import type { UserProfile, UserRole } from '../types/database';

interface ManageUsersErrorResponse {
  error?: string;
}

async function invokeManageUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('manage-users', {
    body,
  });

  if (error) {
    let message = 'Não foi possível concluir a operação nas contas.';
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const parsed = (await ctx.json().catch(() => null)) as ManageUsersErrorResponse | null;
      if (parsed?.error) message = parsed.error;
    } else if (error.message) {
      message = error.message;
    }
    throw new Error(message);
  }

  return data as T;
}

export async function fetchTeamUsers(): Promise<UserProfile[]> {
  const res = await invokeManageUsers<{ users: UserProfile[] }>({ action: 'list' });
  return res.users ?? [];
}

export async function createTeamUser(input: {
  name: string;
  username: string;
  password: string;
  role: UserRole;
}): Promise<UserProfile> {
  const res = await invokeManageUsers<{ user: UserProfile }>({
    action: 'create',
    ...input,
  });
  return res.user;
}

export async function updateTeamUser(input: {
  userId: string;
  name?: string;
  role?: UserRole;
  password?: string;
}): Promise<UserProfile> {
  const res = await invokeManageUsers<{ user: UserProfile }>({
    action: 'update',
    ...input,
  });
  return res.user;
}

export async function deleteTeamUser(userId: string): Promise<void> {
  await invokeManageUsers<{ deleted: boolean }>({
    action: 'delete',
    userId,
  });
}

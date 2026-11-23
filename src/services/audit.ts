import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types/database';

/** Lista eventos recentes de auditoria (sem PII em claro) */
export async function fetchAuditLogs(limit = 30): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, actor_id, actor_role, action, table_name, record_id, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AuditLog[];
}

/** Registra evento resumido de importação em lote no log de auditoria */
export async function logImportAudit(summary: Record<string, unknown>): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: profile?.role ?? null,
    action: 'IMPORT',
    table_name: 'participants',
    record_id: null,
    summary,
  });
}

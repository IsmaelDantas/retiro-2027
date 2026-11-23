import { supabase } from '../lib/supabase';
import { hashCpfFallback } from '../utils/cpf';
import { logImportAudit } from './audit';
import type { NormalizedImportRow } from '../utils/importParser';
import type { Participant } from '../types/database';

export type ImportActionType = 'create' | 'update' | 'unchanged' | 'error';

export interface ImportPreviewItem {
  row: NormalizedImportRow;
  cpf_hash: string | null;
  action: ImportActionType;
  existingParticipantId: string | null;
  reason?: string;
}

export interface ImportPreviewSummary {
  items: ImportPreviewItem[];
  hashSource: 'edge-function' | 'local-fallback';
  counts: {
    total: number;
    create: number;
    update: number;
    unchanged: number;
    error: number;
    cancelled: number;
    minorsWithoutGuardian: number;
  };
}

export interface ImportExecutionResult {
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
}

/** Calcula hashes HMAC-SHA256 via Edge Function (com fallback local seguro para demo/testes) */
export async function computeCpfHashes(
  cpfs: string[]
): Promise<{ hashes: (string | null)[]; source: 'edge-function' | 'local-fallback' }> {
  const hasAnyCpf = cpfs.some((c) => c.length === 11);
  if (!hasAnyCpf) {
    return { hashes: cpfs.map(() => null), source: 'edge-function' };
  }

  try {
    const { data, error } = await supabase.functions.invoke<{ hashes?: (string | null)[] }>('cpf-hash', {
      body: { cpfs },
    });

    if (!error && Array.isArray(data?.hashes) && data.hashes.length === cpfs.length) {
      return { hashes: data.hashes, source: 'edge-function' };
    }
  } catch {
    // Edge function indisponível em ambiente local/demo; usa fallback criptográfico local
  }

  const fallbackHashes = await Promise.all(cpfs.map((c) => hashCpfFallback(c)));
  return { hashes: fallbackHashes, source: 'local-fallback' };
}

function makeNameBirthKey(fullName?: string | null, birthDate?: string | null): string | null {
  const name = (fullName ?? '').trim().toLowerCase();
  if (!name || !birthDate) return null;
  return `${name}|${birthDate}`;
}

function hasParticipantChanges(existing: Partial<Participant>, incoming: NormalizedImportRow, cpfHash: string | null): boolean {
  return (
    existing.full_name !== incoming.full_name ||
    (existing.birth_date ?? null) !== (incoming.birth_date ?? null) ||
    (existing.phone ?? null) !== (incoming.phone ?? null) ||
    (existing.email ?? null) !== (incoming.email ?? null) ||
    (existing.congregation ?? null) !== (incoming.congregation ?? null) ||
    (existing.locality ?? null) !== (incoming.locality ?? null) ||
    (existing.is_resident ?? null) !== (incoming.is_resident ?? null) ||
    existing.status !== incoming.status ||
    (incoming.protocol !== null && existing.protocol !== incoming.protocol) ||
    (cpfHash !== null && existing.cpf_hash !== cpfHash)
  );
}

/** Constrói a pré-visualização idempotente comparando com os participantes já salvos */
export async function buildImportPreview(rows: NormalizedImportRow[]): Promise<ImportPreviewSummary> {
  const { hashes, source } = await computeCpfHashes(rows.map((r) => r.cpf_digits));

  const { data: existingParticipants, error } = await supabase
    .from('participants')
    .select('id, protocol, cpf_hash, full_name, birth_date, phone, email, congregation, locality, is_resident, status, registered_at');

  if (error) throw error;

  const byProtocol = new Map<string, Partial<Participant>>();
  const byCpfHash = new Map<string, Partial<Participant>>();
  const byNameBirth = new Map<string, Partial<Participant>>();

  for (const p of existingParticipants ?? []) {
    if (p.protocol) byProtocol.set(p.protocol, p);
    if (p.cpf_hash) byCpfHash.set(p.cpf_hash, p);
    const nbKey = makeNameBirthKey(p.full_name, p.birth_date);
    if (nbKey) byNameBirth.set(nbKey, p);
  }

  const items: ImportPreviewItem[] = rows.map((row, idx) => {
    const cpf_hash = hashes[idx] ?? null;

    if (row.errors.length > 0) {
      return {
        row,
        cpf_hash,
        action: 'error',
        existingParticipantId: null,
        reason: row.errors.join(' '),
      };
    }

    const match =
      (row.protocol ? byProtocol.get(row.protocol) : undefined) ??
      (cpf_hash ? byCpfHash.get(cpf_hash) : undefined) ??
      (() => {
        const key = makeNameBirthKey(row.full_name, row.birth_date);
        return key ? byNameBirth.get(key) : undefined;
      })();

    if (!match?.id) {
      return {
        row,
        cpf_hash,
        action: 'create',
        existingParticipantId: null,
      };
    }

    const changed = hasParticipantChanges(match, row, cpf_hash);
    return {
      row,
      cpf_hash,
      action: changed ? 'update' : 'unchanged',
      existingParticipantId: match.id,
      reason: changed ? 'Registro existente será atualizado sem duplicar.' : 'Já atualizado no sistema.',
    };
  });

  return {
    items,
    hashSource: source,
    counts: {
      total: items.length,
      create: items.filter((i) => i.action === 'create').length,
      update: items.filter((i) => i.action === 'update').length,
      unchanged: items.filter((i) => i.action === 'unchanged').length,
      error: items.filter((i) => i.action === 'error').length,
      cancelled: items.filter((i) => i.row.status === 'cancelled').length,
      minorsWithoutGuardian: items.filter(
        (i) => i.row.is_minor && (!i.row.guardian_full_name || !i.row.guardian_phone)
      ).length,
    },
  };
}

async function upsertGuardianLink(participantId: string, fullName: string, phone: string): Promise<void> {
  if (!fullName.trim() || !phone.trim()) return;

  const { data: existingGuardians } = await supabase
    .from('guardians')
    .select('id')
    .eq('full_name', fullName.trim())
    .eq('phone', phone.trim())
    .limit(1);

  let guardianId = existingGuardians?.[0]?.id;

  if (!guardianId) {
    const { data: created, error } = await supabase
      .from('guardians')
      .insert({
        full_name: fullName.trim(),
        relationship: 'Responsável legal',
        phone: phone.trim(),
        email: null,
      })
      .select('id')
      .single();
    if (error) throw error;
    guardianId = created.id;
  }

  const { data: existingLink } = await supabase
    .from('participant_guardians')
    .select('participant_id')
    .eq('participant_id', participantId)
    .eq('guardian_id', guardianId)
    .limit(1);

  if (!existingLink || existingLink.length === 0) {
    const { error: linkErr } = await supabase
      .from('participant_guardians')
      .insert({ participant_id: participantId, guardian_id: guardianId });
    if (linkErr) throw linkErr;
  }
}

/** Executa a importação idempotente e registra resumo sanitizado na auditoria */
export async function executeImport(preview: ImportPreviewSummary): Promise<ImportExecutionResult> {
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const item of preview.items) {
    if (item.action === 'error') {
      failed++;
      continue;
    }
    if (item.action === 'unchanged') {
      unchanged++;
      continue;
    }

    const payload = {
      protocol: item.row.protocol,
      cpf_hash: item.cpf_hash,
      full_name: item.row.full_name,
      birth_date: item.row.birth_date,
      phone: item.row.phone,
      email: item.row.email,
      congregation: item.row.congregation,
      locality: item.row.locality,
      is_resident: item.row.is_resident,
      registered_at: item.row.registered_at,
      status: item.row.status,
    };

    try {
      let participantId = item.existingParticipantId;

      if (item.action === 'update' && participantId) {
        const { error } = await supabase
          .from('participants')
          .update(payload)
          .eq('id', participantId);
        if (error) throw error;
        updated++;
      } else {
        const { data: inserted, error } = await supabase
          .from('participants')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        participantId = inserted.id;
        created++;
      }

      if (participantId && item.row.guardian_full_name && item.row.guardian_phone) {
        await upsertGuardianLink(participantId, item.row.guardian_full_name, item.row.guardian_phone);
      }
    } catch {
      failed++;
    }
  }

  await logImportAudit({
    total_rows: preview.counts.total,
    created,
    updated,
    unchanged,
    failed,
    hash_source: preview.hashSource,
  });

  return { created, updated, unchanged, failed };
}

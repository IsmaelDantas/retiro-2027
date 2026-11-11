import { supabase } from '../lib/supabase';
import type {
  Participant,
  ParticipantWithGuardian,
  ParticipantFormData,
  ParticipantStatus,
  DashboardStats,
} from '../types/database';

/** Fetch all participants with their guardians */
export async function fetchParticipants(
  status?: ParticipantStatus | 'all',
  search?: string
): Promise<ParticipantWithGuardian[]> {
  // First, get all participants
  let query = supabase
    .from('participants')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search && search.trim()) {
    query = query.ilike('full_name', `%${search.trim()}%`);
  }

  const { data: participants, error } = await query;
  if (error) throw error;

  if (!participants || participants.length === 0) return [];

  // Get guardian associations for all participants
  const participantIds = participants.map((p) => p.id);
  const { data: links, error: linkError } = await supabase
    .from('participant_guardians')
    .select('participant_id, guardian_id')
    .in('participant_id', participantIds);

  if (linkError) throw linkError;

  // Get unique guardian IDs
  const guardianIds = [...new Set((links ?? []).map((l) => l.guardian_id))];

  let guardiansMap: Record<string, import('../types/database').Guardian> = {};

  if (guardianIds.length > 0) {
    const { data: guardians, error: guardError } = await supabase
      .from('guardians')
      .select('*')
      .in('id', guardianIds);

    if (guardError) throw guardError;

    guardiansMap = Object.fromEntries((guardians ?? []).map((g) => [g.id, g]));
  }

  // Build participant-guardian link map
  const participantGuardianMap: Record<string, string> = {};
  for (const link of links ?? []) {
    participantGuardianMap[link.participant_id] = link.guardian_id;
  }

  // Merge data
  return participants.map((p) => ({
    ...p,
    guardian: participantGuardianMap[p.id]
      ? guardiansMap[participantGuardianMap[p.id]] ?? null
      : null,
  }));
}

/** Fetch a single participant with guardian */
export async function fetchParticipant(id: string): Promise<ParticipantWithGuardian | null> {
  const { data: participant, error } = await supabase
    .from('participants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Get guardian link
  const { data: links } = await supabase
    .from('participant_guardians')
    .select('guardian_id')
    .eq('participant_id', id);

  let guardian = null;

  if (links && links.length > 0) {
    const { data: g } = await supabase
      .from('guardians')
      .select('*')
      .eq('id', links[0].guardian_id)
      .single();
    guardian = g;
  }

  return { ...participant, guardian };
}

/** Create a new participant with guardian */
export async function createParticipant(formData: ParticipantFormData): Promise<Participant> {
  // 1. Create or find guardian
  let guardianId: string | null = null;

  if (formData.guardian_full_name.trim()) {
    // Check if guardian already exists (by name + phone)
    const { data: existing } = await supabase
      .from('guardians')
      .select('id')
      .eq('full_name', formData.guardian_full_name.trim())
      .eq('phone', formData.guardian_phone.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      guardianId = existing[0].id;
    } else {
      const { data: newGuardian, error: gError } = await supabase
        .from('guardians')
        .insert({
          full_name: formData.guardian_full_name.trim(),
          relationship: formData.guardian_relationship.trim(),
          phone: formData.guardian_phone.trim(),
          email: formData.guardian_email.trim() || null,
        })
        .select()
        .single();

      if (gError) throw gError;
      guardianId = newGuardian.id;
    }
  }

  // 2. Create participant
  const { data: participant, error } = await supabase
    .from('participants')
    .insert({
      full_name: formData.full_name.trim(),
      birth_date: formData.birth_date || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      congregation: formData.congregation.trim() || null,
      notes: formData.notes.trim() || null,
      status: formData.status,
    })
    .select()
    .single();

  if (error) throw error;

  // 3. Link participant to guardian
  if (guardianId) {
    const { error: linkError } = await supabase
      .from('participant_guardians')
      .insert({
        participant_id: participant.id,
        guardian_id: guardianId,
      });

    if (linkError) throw linkError;
  }

  return participant;
}

/** Update an existing participant and their guardian */
export async function updateParticipant(
  participantId: string,
  formData: ParticipantFormData,
  existingGuardianId?: string | null
): Promise<Participant> {
  // 1. Update participant
  const { data: participant, error } = await supabase
    .from('participants')
    .update({
      full_name: formData.full_name.trim(),
      birth_date: formData.birth_date || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      congregation: formData.congregation.trim() || null,
      notes: formData.notes.trim() || null,
      status: formData.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select()
    .single();

  if (error) throw error;

  // 2. Update or create guardian
  if (formData.guardian_full_name.trim()) {
    if (existingGuardianId) {
      // Update existing guardian
      const { error: gError } = await supabase
        .from('guardians')
        .update({
          full_name: formData.guardian_full_name.trim(),
          relationship: formData.guardian_relationship.trim(),
          phone: formData.guardian_phone.trim(),
          email: formData.guardian_email.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingGuardianId);

      if (gError) throw gError;
    } else {
      // Create new guardian and link
      const { data: newGuardian, error: gError } = await supabase
        .from('guardians')
        .insert({
          full_name: formData.guardian_full_name.trim(),
          relationship: formData.guardian_relationship.trim(),
          phone: formData.guardian_phone.trim(),
          email: formData.guardian_email.trim() || null,
        })
        .select()
        .single();

      if (gError) throw gError;

      const { error: linkError } = await supabase
        .from('participant_guardians')
        .insert({
          participant_id: participantId,
          guardian_id: newGuardian.id,
        });

      if (linkError) throw linkError;
    }
  }

  return participant;
}

/** Update participant status */
export async function updateParticipantStatus(
  participantId: string,
  status: ParticipantStatus
): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId);

  if (error) throw error;
}

/** Delete a participant */
export async function deleteParticipant(participantId: string): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', participantId);

  if (error) throw error;
}

/** Fetch dashboard statistics */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [participantsResult, guardiansResult] = await Promise.all([
    supabase.from('participants').select('status'),
    supabase.from('guardians').select('id', { count: 'exact', head: true }),
  ]);

  if (participantsResult.error) throw participantsResult.error;
  if (guardiansResult.error) throw guardiansResult.error;

  const participants = participantsResult.data ?? [];

  return {
    total_participants: participants.length,
    confirmed: participants.filter((p) => p.status === 'confirmed').length,
    pending: participants.filter((p) => p.status === 'pending').length,
    total_guardians: guardiansResult.count ?? 0,
  };
}

/** Fetch recent participants (for dashboard) */
export async function fetchRecentParticipants(limit = 5): Promise<ParticipantWithGuardian[]> {
  return fetchParticipants(undefined, undefined).then((participants) =>
    participants.slice(0, limit)
  );
}

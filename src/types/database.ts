/* ===== Type definitions for the Retiro 2027 database ===== */

export type ParticipantStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Participant {
  id: string;
  full_name: string;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  congregation: string | null;
  notes: string | null;
  status: ParticipantStatus;
  created_at: string;
  updated_at: string;
}

export interface Guardian {
  id: string;
  full_name: string;
  relationship: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantGuardian {
  participant_id: string;
  guardian_id: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

/** Participant with associated guardian data (for list/detail views) */
export interface ParticipantWithGuardian extends Participant {
  guardian: Guardian | null;
}

/** Form data for creating/editing a participant */
export interface ParticipantFormData {
  full_name: string;
  birth_date: string;
  phone: string;
  email: string;
  congregation: string;
  notes: string;
  status: ParticipantStatus;
  guardian_full_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  guardian_email: string;
}

/** Dashboard statistics */
export interface DashboardStats {
  total_participants: number;
  confirmed: number;
  pending: number;
  total_guardians: number;
}

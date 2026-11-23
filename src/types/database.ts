/* ===== Type definitions for the Retiro 2027 database ===== */

export type ParticipantStatus = 'pending' | 'confirmed' | 'cancelled';
export type UserRole = 'admin' | 'coordinator' | 'viewer';
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'IMPORT';

export interface Participant {
  id: string;
  protocol: string | null;
  cpf_hash: string | null;
  full_name: string;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  congregation: string | null;
  locality: string | null;
  is_resident: boolean | null;
  registered_at: string | null;
  shirt_purchased: boolean;
  shirt_size: ShirtSize | null;
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
  role: UserRole | string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  summary: Record<string, unknown>;
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
  locality?: string;
  is_resident?: 'yes' | 'no' | '';
  shirt_purchased?: boolean;
  shirt_size?: ShirtSize | '';
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

/* ===== Payment & Shirt types ===== */

export type PaymentCategory = 'shirt' | 'registration' | 'other';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'pix' | 'cash' | 'card' | 'transfer';
export type ShirtSize = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG';

export interface Payment {
  id: string;
  participant_id: string;
  category: PaymentCategory;
  description: string | null;
  shirt_size: ShirtSize | null;
  amount: number;
  paid_amount: number;
  status: PaymentStatus;
  payment_method: PaymentMethod | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithParticipant extends Payment {
  participant: ParticipantWithGuardian | null;
}

export interface PaymentFormData {
  participant_id: string;
  category: PaymentCategory;
  description: string;
  shirt_size: ShirtSize | '';
  amount: string;
  paid_amount: string;
  status: PaymentStatus;
  payment_method: PaymentMethod | '';
  notes: string;
}

export interface PaymentSummary {
  total_expected: number;
  total_collected: number;
  total_pending: number;
  paid_count: number;
  partial_count: number;
  unpaid_count: number;
  shirt_count: number;
  shirt_sizes: Record<ShirtSize, number>;
}

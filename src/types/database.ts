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

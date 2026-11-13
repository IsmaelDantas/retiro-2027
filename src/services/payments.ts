import { supabase } from '../lib/supabase';
import { fetchParticipants } from './participants';
import { computePaymentStatus, SHIRT_SIZES } from '../utils/payment';
import type {
  ParticipantWithGuardian,
  Payment,
  PaymentCategory,
  PaymentFormData,
  PaymentMethod,
  PaymentSummary,
  PaymentWithParticipant,
  ShirtSize,
} from '../types/database';

/** Detect if Supabase table `public.payments` has not been created yet */
export function isPaymentsTableMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string; details?: string; hint?: string };
  const text = `${err.code ?? ''} ${err.message ?? ''} ${err.details ?? ''} ${err.hint ?? ''}`.toLowerCase();
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    text.includes('public.payments') ||
    text.includes('relation "payments" does not exist') ||
    text.includes("could not find the table 'public.payments'")
  );
}

function normalizeNumber(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizePaymentRow(row: Payment): Payment {
  return {
    ...row,
    amount: Number(row.amount ?? 0),
    paid_amount: Number(row.paid_amount ?? 0),
  };
}

/** Fetch all payments joined with participant & guardian info */
export async function fetchPaymentsWithParticipants(): Promise<{
  payments: PaymentWithParticipant[];
  participants: ParticipantWithGuardian[];
}> {
  const [paymentsRes, participants] = await Promise.all([
    supabase.from('payments').select('*').order('created_at', { ascending: false }),
    fetchParticipants(),
  ]);

  if (paymentsRes.error) throw paymentsRes.error;

  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p]));

  const payments: PaymentWithParticipant[] = (paymentsRes.data ?? []).map((row) => {
    const normalized = normalizePaymentRow(row as Payment);
    return {
      ...normalized,
      participant: participantMap[normalized.participant_id] ?? null,
    };
  });

  return { payments, participants };
}

/** Fetch all payments for a single participant */
export async function fetchParticipantPayments(participantId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('participant_id', participantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => normalizePaymentRow(row as Payment));
}

/** Create a new payment record */
export async function createPayment(formData: PaymentFormData): Promise<Payment> {
  const amount = normalizeNumber(formData.amount);
  let paidAmount = normalizeNumber(formData.paid_amount);

  if (formData.status === 'paid' && paidAmount < amount) {
    paidAmount = amount;
  } else if (formData.status === 'unpaid') {
    paidAmount = 0;
  }

  const finalStatus =
    formData.status === 'paid' && amount === 0
      ? 'paid'
      : computePaymentStatus(amount, paidAmount);

  const payload = {
    participant_id: formData.participant_id,
    category: formData.category,
    description: formData.description.trim() || null,
    shirt_size: formData.category === 'shirt' && formData.shirt_size ? formData.shirt_size : null,
    amount,
    paid_amount: paidAmount,
    status: finalStatus,
    payment_method:
      finalStatus === 'unpaid' ? null : formData.payment_method || 'pix',
    paid_at: finalStatus === 'unpaid' ? null : new Date().toISOString(),
    notes: formData.notes.trim() || null,
  };

  const { data, error } = await supabase
    .from('payments')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return normalizePaymentRow(data as Payment);
}

/** Update an existing payment record */
export async function updatePayment(
  paymentId: string,
  formData: PaymentFormData,
  existingPaidAt?: string | null
): Promise<Payment> {
  const amount = normalizeNumber(formData.amount);
  let paidAmount = normalizeNumber(formData.paid_amount);

  if (formData.status === 'paid' && paidAmount < amount) {
    paidAmount = amount;
  } else if (formData.status === 'unpaid') {
    paidAmount = 0;
  }

  const finalStatus =
    formData.status === 'paid' && amount === 0
      ? 'paid'
      : computePaymentStatus(amount, paidAmount);

  const payload = {
    participant_id: formData.participant_id,
    category: formData.category,
    description: formData.description.trim() || null,
    shirt_size: formData.category === 'shirt' && formData.shirt_size ? formData.shirt_size : null,
    amount,
    paid_amount: paidAmount,
    status: finalStatus,
    payment_method:
      finalStatus === 'unpaid' ? null : formData.payment_method || 'pix',
    paid_at:
      finalStatus === 'unpaid'
        ? null
        : existingPaidAt || new Date().toISOString(),
    notes: formData.notes.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('payments')
    .update(payload)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return normalizePaymentRow(data as Payment);
}

/** Quick 1-tap toggle to mark a payment as fully paid */
export async function markPaymentAsPaid(
  paymentId: string,
  amount: number,
  method: PaymentMethod = 'pix'
): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .update({
      paid_amount: amount,
      status: 'paid',
      payment_method: method,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return normalizePaymentRow(data as Payment);
}

/** Quick 1-tap toggle to mark a payment as unpaid */
export async function markPaymentAsUnpaid(paymentId: string): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .update({
      paid_amount: 0,
      status: 'unpaid',
      payment_method: null,
      paid_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return normalizePaymentRow(data as Payment);
}

/** Delete a payment record */
export async function deletePayment(paymentId: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', paymentId);
  if (error) throw error;
}

/** Generate unpaid payment entries in batch for participants without one in the category */
export async function batchCreateUnpaidPayments(
  participantIds: string[],
  category: PaymentCategory,
  description: string,
  amount: number
): Promise<Payment[]> {
  if (participantIds.length === 0) return [];

  const rows = participantIds.map((participantId) => ({
    participant_id: participantId,
    category,
    description: description.trim() || (category === 'shirt' ? 'Blusa Retiro 2027' : 'Inscrição Retiro 2027'),
    shirt_size: null,
    amount,
    paid_amount: 0,
    status: 'unpaid',
    payment_method: null,
    paid_at: null,
  }));

  const { data, error } = await supabase.from('payments').insert(rows).select();
  if (error) throw error;
  return (data ?? []).map((row) => normalizePaymentRow(row as Payment));
}

/** Compute aggregated summary stats from a list of payments */
export function calculatePaymentSummary(payments: Payment[]): PaymentSummary {
  const shirtSizes = Object.fromEntries(
    SHIRT_SIZES.map((size) => [size, 0])
  ) as Record<ShirtSize, number>;

  let totalExpected = 0;
  let totalCollected = 0;
  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let shirtCount = 0;

  for (const p of payments) {
    const amount = Number(p.amount ?? 0);
    const paid = Number(p.paid_amount ?? 0);
    totalExpected += amount;
    totalCollected += paid;

    if (p.status === 'paid') paidCount++;
    else if (p.status === 'partial') partialCount++;
    else unpaidCount++;

    if (p.category === 'shirt') {
      shirtCount++;
      if (p.shirt_size && shirtSizes[p.shirt_size] !== undefined) {
        shirtSizes[p.shirt_size]++;
      }
    }
  }

  return {
    total_expected: totalExpected,
    total_collected: totalCollected,
    total_pending: Math.max(0, totalExpected - totalCollected),
    paid_count: paidCount,
    partial_count: partialCount,
    unpaid_count: unpaidCount,
    shirt_count: shirtCount,
    shirt_sizes: shirtSizes,
  };
}

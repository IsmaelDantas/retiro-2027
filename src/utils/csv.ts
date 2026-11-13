import type { ParticipantWithGuardian, PaymentWithParticipant } from '../types/database';
import { calculateAge, formatDate } from './date';
import { getStatusLabel } from './status';
import {
  getPaymentCategoryLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from './payment';

/**
 * Convert an array of participants to CSV string.
 * Includes UTF-8 BOM for Excel compatibility.
 */
export function participantsToCSV(participants: ParticipantWithGuardian[]): string {
  const BOM = '\uFEFF';

  const headers = [
    'Nome',
    'Data de Nascimento',
    'Idade',
    'Telefone',
    'E-mail',
    'Congregação',
    'Responsável',
    'Parentesco',
    'Telefone do Responsável',
    'Status',
    'Data da Inscrição',
  ];

  const rows = participants.map((p) => [
    escapeCSV(p.full_name),
    escapeCSV(formatDate(p.birth_date)),
    p.birth_date ? String(calculateAge(p.birth_date) ?? '') : '',
    escapeCSV(p.phone ?? ''),
    escapeCSV(p.email ?? ''),
    escapeCSV(p.congregation ?? ''),
    escapeCSV(p.guardian?.full_name ?? ''),
    escapeCSV(p.guardian?.relationship ?? ''),
    escapeCSV(p.guardian?.phone ?? ''),
    escapeCSV(getStatusLabel(p.status)),
    escapeCSV(formatDate(p.created_at)),
  ]);

  const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');

  return BOM + csvContent;
}

/**
 * Convert an array of payments (or unpaid participant entries) to CSV string.
 * Includes UTF-8 BOM for Excel compatibility.
 */
export function paymentsToCSV(
  payments: PaymentWithParticipant[],
  unpaidParticipants: ParticipantWithGuardian[] = [],
  categoryLabelFallback = 'Blusa'
): string {
  const BOM = '\uFEFF';

  const headers = [
    'Participante',
    'Congregação',
    'Telefone',
    'Responsável',
    'Telefone do Responsável',
    'Categoria',
    'Descrição',
    'Tamanho da Blusa',
    'Valor Total (R$)',
    'Valor Pago (R$)',
    'Restante (R$)',
    'Status do Pagamento',
    'Forma de Pagamento',
    'Data do Pagamento',
    'Observações',
  ];

  const paymentRows = payments.map((p) => {
    const remaining = Math.max(0, Number(p.amount) - Number(p.paid_amount));
    return [
      escapeCSV(p.participant?.full_name ?? 'Participante'),
      escapeCSV(p.participant?.congregation ?? ''),
      escapeCSV(p.participant?.phone ?? ''),
      escapeCSV(p.participant?.guardian?.full_name ?? ''),
      escapeCSV(p.participant?.guardian?.phone ?? ''),
      escapeCSV(getPaymentCategoryLabel(p.category)),
      escapeCSV(p.description ?? ''),
      escapeCSV(p.shirt_size ?? ''),
      Number(p.amount).toFixed(2).replace('.', ','),
      Number(p.paid_amount).toFixed(2).replace('.', ','),
      remaining.toFixed(2).replace('.', ','),
      escapeCSV(getPaymentStatusLabel(p.status)),
      escapeCSV(getPaymentMethodLabel(p.payment_method)),
      escapeCSV(formatDate(p.paid_at)),
      escapeCSV(p.notes ?? ''),
    ];
  });

  const missingRows = unpaidParticipants.map((part) => [
    escapeCSV(part.full_name),
    escapeCSV(part.congregation ?? ''),
    escapeCSV(part.phone ?? ''),
    escapeCSV(part.guardian?.full_name ?? ''),
    escapeCSV(part.guardian?.phone ?? ''),
    escapeCSV(categoryLabelFallback),
    escapeCSV('Sem registro de pagamento'),
    '',
    '0,00',
    '0,00',
    '0,00',
    'Não pago',
    '—',
    '—',
    '',
  ]);

  const csvContent = [
    headers.join(';'),
    ...[...paymentRows, ...missingRows].map((row) => row.join(';')),
  ].join('\n');

  return BOM + csvContent;
}

/** Download a CSV string as a file */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

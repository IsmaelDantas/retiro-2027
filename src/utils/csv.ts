import type { ParticipantWithGuardian } from '../types/database';
import { calculateAge, formatDate } from './date';
import { getStatusLabel } from './status';

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

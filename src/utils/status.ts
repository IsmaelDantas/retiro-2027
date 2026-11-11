import type { ParticipantStatus } from '../types/database';

export const STATUS_MAP: Record<
  ParticipantStatus,
  { label: string; color: string; bgColor: string; dotColor: string; borderColor: string }
> = {
  pending: {
    label: 'Pendente',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  confirmed: {
    label: 'Confirmado',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    dotColor: 'bg-rose-500',
  },
};

export function getStatusLabel(status: ParticipantStatus): string {
  return STATUS_MAP[status]?.label ?? status;
}

export const STATUS_OPTIONS: { value: ParticipantStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
];

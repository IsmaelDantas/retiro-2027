import type {
  PaymentCategory,
  PaymentMethod,
  PaymentStatus,
  ShirtSize,
} from '../types/database';

export const SHIRT_SIZES: ShirtSize[] = ['PP', 'P', 'M', 'G', 'GG', 'XG'];

export const PAYMENT_STATUS_MAP: Record<
  PaymentStatus,
  { label: string; color: string; bgColor: string; dotColor: string; borderColor: string }
> = {
  unpaid: {
    label: 'Não pago',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    dotColor: 'bg-rose-500',
  },
  partial: {
    label: 'Parcial',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  paid: {
    label: 'Pago',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
};

export const PAYMENT_CATEGORY_MAP: Record<PaymentCategory, string> = {
  shirt: 'Blusa',
  registration: 'Inscrição',
  other: 'Outro',
};

export const PAYMENT_METHOD_MAP: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão',
  transfer: 'Transferência',
};

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'paid', label: 'Pagos' },
  { value: 'partial', label: 'Parcial' },
  { value: 'unpaid', label: 'Não pagos' },
];

export const PAYMENT_CATEGORY_OPTIONS: { value: PaymentCategory | 'all'; label: string }[] = [
  { value: 'shirt', label: 'Blusas' },
  { value: 'registration', label: 'Inscrições' },
  { value: 'other', label: 'Outros' },
  { value: 'all', label: 'Todos' },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_MAP[status]?.label ?? status;
}

export function getPaymentCategoryLabel(category: PaymentCategory): string {
  return PAYMENT_CATEGORY_MAP[category] ?? category;
}

export function getPaymentMethodLabel(method: PaymentMethod | null): string {
  if (!method) return '—';
  return PAYMENT_METHOD_MAP[method] ?? method;
}

export function computePaymentStatus(amount: number, paidAmount: number): PaymentStatus {
  if (paidAmount <= 0) return 'unpaid';
  if (amount > 0 && paidAmount >= amount) return 'paid';
  return 'partial';
}

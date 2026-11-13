import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { TextArea } from '../ui/TextArea';
import { Button } from '../ui/Button';
import {
  PAYMENT_METHOD_MAP,
  PAYMENT_STATUS_MAP,
  SHIRT_SIZES,
  computePaymentStatus,
} from '../../utils/payment';
import type {
  ParticipantWithGuardian,
  Payment,
  PaymentCategory,
  PaymentFormData,
  PaymentMethod,
  PaymentStatus,
  ShirtSize,
} from '../../types/database';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: PaymentFormData, editingPayment?: Payment | null) => Promise<void>;
  participants: ParticipantWithGuardian[];
  editingPayment?: Payment | null;
  defaultParticipantId?: string;
  defaultCategory?: PaymentCategory;
  defaultAmount?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'shirt', label: 'Blusa do Retiro' },
  { value: 'registration', label: 'Inscrição' },
  { value: 'other', label: 'Outro' },
];

const METHOD_OPTIONS = [
  { value: 'pix', label: PAYMENT_METHOD_MAP.pix },
  { value: 'cash', label: PAYMENT_METHOD_MAP.cash },
  { value: 'card', label: PAYMENT_METHOD_MAP.card },
  { value: 'transfer', label: PAYMENT_METHOD_MAP.transfer },
];

function getDefaultDescription(category: PaymentCategory): string {
  if (category === 'shirt') return 'Blusa Retiro 2027';
  if (category === 'registration') return 'Inscrição Retiro 2027';
  return '';
}

export function PaymentModal({
  isOpen,
  onClose,
  onSave,
  participants,
  editingPayment,
  defaultParticipantId = '',
  defaultCategory = 'shirt',
  defaultAmount = '45.00',
}: PaymentModalProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    participant_id: defaultParticipantId,
    category: defaultCategory,
    description: getDefaultDescription(defaultCategory),
    shirt_size: '',
    amount: defaultAmount,
    paid_amount: defaultAmount,
    status: 'paid',
    payment_method: 'pix',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (editingPayment) {
      setFormData({
        participant_id: editingPayment.participant_id,
        category: editingPayment.category,
        description: editingPayment.description ?? getDefaultDescription(editingPayment.category),
        shirt_size: editingPayment.shirt_size ?? '',
        amount: String(editingPayment.amount ?? 0),
        paid_amount: String(editingPayment.paid_amount ?? 0),
        status: editingPayment.status,
        payment_method: editingPayment.payment_method ?? 'pix',
        notes: editingPayment.notes ?? '',
      });
    } else {
      const cat = defaultCategory;
      setFormData({
        participant_id: defaultParticipantId || (participants[0]?.id ?? ''),
        category: cat,
        description: getDefaultDescription(cat),
        shirt_size: '',
        amount: defaultAmount,
        paid_amount: defaultAmount,
        status: 'paid',
        payment_method: 'pix',
        notes: '',
      });
    }
  }, [isOpen, editingPayment, defaultParticipantId, defaultCategory, defaultAmount, participants]);

  const handleCategoryChange = (category: PaymentCategory) => {
    setFormData((prev) => {
      const shouldUpdateDesc =
        !prev.description ||
        prev.description === 'Blusa Retiro 2027' ||
        prev.description === 'Inscrição Retiro 2027';
      return {
        ...prev,
        category,
        description: shouldUpdateDesc ? getDefaultDescription(category) : prev.description,
        shirt_size: category === 'shirt' ? prev.shirt_size : '',
      };
    });
  };

  const handleStatusSelect = (status: PaymentStatus) => {
    setFormData((prev) => {
      let paidAmount = prev.paid_amount;
      if (status === 'paid') {
        paidAmount = prev.amount || '0';
      } else if (status === 'unpaid') {
        paidAmount = '0';
      } else if (status === 'partial' && (Number(prev.paid_amount) <= 0 || Number(prev.paid_amount) >= Number(prev.amount))) {
        const half = Math.max(0, Number(prev.amount || 0) / 2);
        paidAmount = half > 0 ? half.toFixed(2) : '0';
      }
      return { ...prev, status, paid_amount: paidAmount };
    });
  };

  const handlePaidAmountChange = (val: string) => {
    const amountNum = Number(formData.amount.replace(',', '.')) || 0;
    const paidNum = Number(val.replace(',', '.')) || 0;
    const nextStatus = computePaymentStatus(amountNum, paidNum);
    setFormData((prev) => ({ ...prev, paid_amount: val, status: nextStatus }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.participant_id) {
      setError('Selecione um participante.');
      return;
    }
    if (formData.category === 'shirt' && !formData.shirt_size) {
      setError('Selecione o tamanho da blusa.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave(formData, editingPayment);
      onClose();
    } catch {
      setError('Não foi possível salvar o pagamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const participantOptions = [
    { value: '', label: 'Selecione o participante...' },
    ...participants.map((p) => ({
      value: p.id,
      label: p.congregation ? `${p.full_name} (${p.congregation})` : p.full_name,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPayment ? 'Editar Pagamento' : 'Registrar Pagamento / Blusa'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <Select
          label="Participante"
          value={formData.participant_id}
          onChange={(e) => setFormData((prev) => ({ ...prev, participant_id: e.target.value }))}
          options={participantOptions}
          disabled={Boolean(editingPayment) || Boolean(defaultParticipantId)}
          required
          id="payment-participant"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Categoria"
            value={formData.category}
            onChange={(e) => handleCategoryChange(e.target.value as PaymentCategory)}
            options={CATEGORY_OPTIONS}
            required
            id="payment-category"
          />

          <Input
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Ex: Blusa Retiro 2027"
            id="payment-description"
          />
        </div>

        {/* Shirt Size Selector */}
        {formData.category === 'shirt' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Tamanho da Blusa <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-6 gap-2">
              {SHIRT_SIZES.map((size: ShirtSize) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, shirt_size: size }))}
                  className={`
                    py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer
                    ${
                      formData.shirt_size === size
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-border hover:bg-slate-50'
                    }
                  `}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment Status Quick Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">
            Situação do Pagamento
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['paid', 'partial', 'unpaid'] as PaymentStatus[]).map((st) => {
              const cfg = PAYMENT_STATUS_MAP[st];
              const isSelected = formData.status === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusSelect(st)}
                  className={`
                    flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer
                    ${
                      isSelected
                        ? `${cfg.bgColor} ${cfg.color} ${cfg.borderColor} ring-2 ring-offset-1 ring-indigo-500`
                        : 'bg-white text-slate-600 border-border hover:bg-slate-50'
                    }
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valor total (R$)"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => {
              const nextAmt = e.target.value;
              setFormData((prev) => ({
                ...prev,
                amount: nextAmt,
                paid_amount: prev.status === 'paid' ? nextAmt : prev.paid_amount,
              }));
            }}
            required
            id="payment-amount"
          />

          <Input
            label="Valor pago (R$)"
            type="number"
            step="0.01"
            min="0"
            value={formData.paid_amount}
            onChange={(e) => handlePaidAmountChange(e.target.value)}
            required
            id="payment-paid-amount"
          />
        </div>

        {formData.status !== 'unpaid' && (
          <Select
            label="Forma de pagamento"
            value={formData.payment_method || 'pix'}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                payment_method: e.target.value as PaymentMethod,
              }))
            }
            options={METHOD_OPTIONS}
            id="payment-method"
          />
        )}

        <TextArea
          label="Observações"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Ex: Pago via Pix para coordenador João..."
          rows={2}
          id="payment-notes"
        />

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" loading={submitting}>
            <Save className="w-4 h-4" />
            {editingPayment ? 'Salvar alterações' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

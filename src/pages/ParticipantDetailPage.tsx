import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User as UserIcon,
  Users,
  Wallet,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchParticipant,
  updateParticipantStatus,
  deleteParticipant,
} from '../services/participants';
import {
  createPayment,
  deletePayment,
  fetchParticipantPayments,
  isPaymentsTableMissingError,
  markPaymentAsPaid,
  updatePayment,
} from '../services/payments';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { DetailSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { PaymentBadge } from '../components/payments/PaymentBadge';
import { PaymentModal } from '../components/payments/PaymentModal';
import { useToast } from '../contexts/ToastContext';
import { calculateAge, formatDate, formatDateTime } from '../utils/date';
import { formatCurrency, getPaymentCategoryLabel, getPaymentMethodLabel } from '../utils/payment';
import type {
  ParticipantStatus,
  ParticipantWithGuardian,
  Payment,
  PaymentFormData,
} from '../types/database';
import { STATUS_MAP } from '../utils/status';

export function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [participant, setParticipant] = useState<ParticipantWithGuardian | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsMissingTable, setPaymentsMissingTable] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);

  const loadParticipant = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchParticipant(id);
      if (!data) {
        setError('Participante não encontrado.');
      } else {
        setParticipant(data);
        try {
          const payData = await fetchParticipantPayments(id);
          setPayments(payData);
          setPaymentsMissingTable(false);
        } catch (payErr) {
          if (isPaymentsTableMissingError(payErr)) {
            setPaymentsMissingTable(true);
          }
        }
      }
    } catch {
      setError('Não foi possível carregar os dados do participante.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadParticipant();
  }, [loadParticipant]);

  const handleSavePayment = async (formData: PaymentFormData, editing?: Payment | null) => {
    if (editing) {
      await updatePayment(editing.id, formData, editing.paid_at);
      showToast('Pagamento atualizado com sucesso.');
    } else {
      await createPayment(formData);
      showToast('Pagamento registrado com sucesso.');
    }
    if (id) {
      const updated = await fetchParticipantPayments(id);
      setPayments(updated);
    }
  };

  const handleQuickPay = async (payment: Payment) => {
    setBusyPaymentId(payment.id);
    try {
      await markPaymentAsPaid(payment.id, payment.amount, payment.payment_method ?? 'pix');
      showToast('Pagamento confirmado!');
      if (id) {
        const updated = await fetchParticipantPayments(id);
        setPayments(updated);
      }
    } catch {
      showToast('Erro ao confirmar pagamento.', 'error');
    } finally {
      setBusyPaymentId(null);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    setBusyPaymentId(paymentId);
    try {
      await deletePayment(paymentId);
      showToast('Registro de pagamento excluído.');
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    } catch {
      showToast('Erro ao excluir pagamento.', 'error');
    } finally {
      setBusyPaymentId(null);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteParticipant(id);
      showToast('Participante excluído com sucesso.');
      navigate('/participants', { replace: true });
    } catch {
      showToast('Não foi possível excluir o participante.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleStatusChange = async (newStatus: ParticipantStatus) => {
    if (!id || !participant) return;
    setUpdatingStatus(true);
    try {
      await updateParticipantStatus(id, newStatus);
      setParticipant({ ...participant, status: newStatus });
      showToast(`Status alterado para "${STATUS_MAP[newStatus].label}".`);
      setShowStatusModal(false);
    } catch {
      showToast('Não foi possível alterar o status.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <ErrorState
          message={error || 'Participante não encontrado.'}
          onRetry={loadParticipant}
        />
      </div>
    );
  }

  const age = calculateAge(participant.birth_date);

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{participant.full_name}</h1>
          <div className="mt-1">
            <Badge status={participant.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowStatusModal(true)}
          >
            Alterar Status
          </Button>
          <Link to={`/participants/${id}/edit`}>
            <Button variant="secondary" size="sm">
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Participant Info */}
      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-primary-600" />
          Dados do Participante
        </h2>
        <div className="space-y-3">
          <InfoRow icon={<UserIcon className="w-4 h-4" />} label="Nome" value={participant.full_name} />
          {participant.birth_date && (
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Nascimento"
              value={`${formatDate(participant.birth_date)}${age !== null ? ` (${age} anos)` : ''}`}
            />
          )}
          {participant.phone && (
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={participant.phone} />
          )}
          {participant.email && (
            <InfoRow icon={<Mail className="w-4 h-4" />} label="E-mail" value={participant.email} />
          )}
          {participant.congregation && (
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Congregação" value={participant.congregation} />
          )}
          {participant.notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-text-tertiary mb-1">Observações</p>
              <p className="text-sm text-text-secondary">{participant.notes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Guardian Info */}
      {participant.guardian && (
        <Card>
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            Responsável
          </h2>
          <div className="space-y-3">
            <InfoRow icon={<UserIcon className="w-4 h-4" />} label="Nome" value={participant.guardian.full_name} />
            <InfoRow label="Parentesco" value={participant.guardian.relationship} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={participant.guardian.phone} />
            {participant.guardian.email && (
              <InfoRow icon={<Mail className="w-4 h-4" />} label="E-mail" value={participant.guardian.email} />
            )}
          </div>
        </Card>
      )}

      {/* Registration Info */}
      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-600" />
          Inscrição
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Status</span>
            <Badge status={participant.status} />
          </div>
          <InfoRow label="Cadastro" value={formatDateTime(participant.created_at)} />
          <InfoRow label="Última atualização" value={formatDateTime(participant.updated_at)} />
        </div>
      </Card>

      {/* Payments & Shirts Info */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary-600" />
            Pagamentos & Blusa
          </h2>
          {!paymentsMissingTable && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingPayment(null);
                setPaymentModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar
            </Button>
          )}
        </div>

        {paymentsMissingTable ? (
          <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            Execute <code className="font-mono">supabase/migration_payments.sql</code> no Supabase para ativar os pagamentos.
          </p>
        ) : payments.length === 0 ? (
          <p className="text-xs text-text-tertiary">
            Nenhum pagamento ou pedido de blusa registrado para este participante ainda.
          </p>
        ) : (
          <div className="space-y-2.5">
            {payments.map((pay) => (
              <div
                key={pay.id}
                className="p-3 rounded-xl border border-border bg-surface-secondary/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {pay.description || getPaymentCategoryLabel(pay.category)}
                    </span>
                    {pay.shirt_size && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                        Tam: {pay.shirt_size}
                      </span>
                    )}
                    <PaymentBadge status={pay.status} />
                  </div>
                  <p className="text-xs text-text-secondary">
                    Pago: <strong>{formatCurrency(pay.paid_amount)}</strong> de{' '}
                    {formatCurrency(pay.amount)}
                    {pay.payment_method ? ` • ${getPaymentMethodLabel(pay.payment_method)}` : ''}
                    {pay.paid_at ? ` • ${formatDate(pay.paid_at)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {pay.status !== 'paid' && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2.5 py-1.5"
                      loading={busyPaymentId === pay.id}
                      onClick={() => handleQuickPay(pay)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Pagar
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="px-2.5 py-1.5"
                    onClick={() => {
                      setEditingPayment(pay);
                      setPaymentModalOpen(true);
                    }}
                    title="Editar pagamento"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="px-2.5 py-1.5"
                    loading={busyPaymentId === pay.id}
                    onClick={() => handleDeletePayment(pay.id)}
                    title="Excluir pagamento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* LGPD Notice */}
      <p className="text-xs text-text-tertiary text-center px-4 pb-2">
        Os dados exibidos são utilizados exclusivamente para a organização do Retiro de Jovens 2027.
      </p>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Excluir Participante"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Tem certeza que deseja excluir <strong>{participant.full_name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Alterar Status"
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary mb-2">
            Selecione o novo status para <strong>{participant.full_name}</strong>:
          </p>
          {(Object.keys(STATUS_MAP) as ParticipantStatus[]).map((status) => (
            <button
              key={status}
              disabled={participant.status === status || updatingStatus}
              onClick={() => handleStatusChange(status)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left
                transition-all duration-150 cursor-pointer
                ${
                  participant.status === status
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-border hover:border-primary-300 hover:bg-surface-secondary'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_MAP[status].dotColor}`} />
              <span className="text-sm font-medium text-text-primary">
                {STATUS_MAP[status].label}
              </span>
              {participant.status === status && (
                <span className="text-xs text-text-tertiary ml-auto">(atual)</span>
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* Payment Create/Edit Modal */}
      {participant && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSave={handleSavePayment}
          participants={[
            {
              ...participant,
            },
          ]}
          editingPayment={editingPayment}
          defaultParticipantId={participant.id}
          defaultCategory="shirt"
        />
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-text-tertiary mt-0.5 flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-tertiary">{label}</p>
        <p className="text-sm text-text-primary">{value}</p>
      </div>
    </div>
  );
}

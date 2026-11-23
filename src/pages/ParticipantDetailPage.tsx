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
  MessageCircle,
  Shirt,
  Home,
  ShieldAlert,
} from 'lucide-react';
import {
  fetchParticipant,
  updateParticipantStatus,
  updateParticipantShirt,
  deleteParticipant,
} from '../services/participants';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { DetailSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useParticipantsData } from '../contexts/ParticipantsDataContext';
import { canManageData } from '../utils/permissions';
import { calculateAgeAtRetreat, formatDate, formatDateTime, isMinorAtRetreat } from '../utils/date';
import { SHIRT_SIZES } from '../utils/payment';
import { buildWhatsAppUrl, formatPhone } from '../utils/phone';
import { isMinorMissingGuardian } from '../utils/dashboardMetrics';
import type {
  ParticipantStatus,
  ParticipantWithGuardian,
  ShirtSize,
} from '../types/database';
import { STATUS_MAP } from '../utils/status';

export function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { profile } = useAuth();
  const { refresh, patchStatusLocal, patchShirtLocal } = useParticipantsData();
  const writable = canManageData(profile?.role);

  const [participant, setParticipant] = useState<ParticipantWithGuardian | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingShirt, setSavingShirt] = useState(false);

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
      }
    } catch {
      setError('Não foi possível carregar os dados do participante.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadParticipant();
  }, [loadParticipant]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteParticipant(id);
      await refresh(true);
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
      patchStatusLocal(id, newStatus);
      showToast(`Status alterado para "${STATUS_MAP[newStatus].label}".`);
      setShowStatusModal(false);
    } catch {
      showToast('Não foi possível alterar o status.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleToggleShirt = async (purchased: boolean, size?: ShirtSize | null) => {
    if (!id || !participant) return;
    setSavingShirt(true);
    try {
      const nextSize = purchased ? (size === undefined ? participant.shirt_size : size) : null;
      await updateParticipantShirt(id, purchased, nextSize);
      setParticipant({
        ...participant,
        shirt_purchased: purchased,
        shirt_size: nextSize ?? null,
      });
      patchShirtLocal(id, purchased, nextSize ?? null);
      showToast(purchased ? 'Camisa marcada como comprada (Sim).' : 'Camisa marcada como Não comprada.');
    } catch {
      showToast('Não foi possível atualizar a confirmação da camisa.', 'error');
    } finally {
      setSavingShirt(false);
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

  const age = calculateAgeAtRetreat(participant.birth_date);
  const isMinor = isMinorAtRetreat(participant.birth_date);
  const missingGuardian = isMinorMissingGuardian(participant);
  const waParticipant = buildWhatsAppUrl(participant.phone);
  const waGuardian = buildWhatsAppUrl(participant.guardian?.phone);

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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {participant.full_name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge status={participant.status} />
            {participant.protocol && (
              <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                Prot. {participant.protocol}
              </span>
            )}
            {isMinor && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                Menor (&lt; 18 em 06/02/2027)
              </span>
            )}
          </div>
        </div>
        {writable && (
          <div className="flex flex-wrap items-center gap-2">
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
              aria-label="Excluir participante"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Alert if minor has no guardian */}
      {missingGuardian && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
          <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Atenção:</strong> Participante menor de 18 anos sem nome e WhatsApp do responsável cadastrado.
          </span>
        </div>
      )}

      {/* Participant Info */}
      <Card>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-primary-600" />
            Dados do Participante
          </h2>
          {waParticipant && (
            <a
              href={waParticipant}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp do Jovem
            </a>
          )}
        </div>
        <div className="space-y-3">
          <InfoRow icon={<UserIcon className="w-4 h-4" />} label="Nome" value={participant.full_name} />
          {participant.birth_date && (
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Nascimento"
              value={`${formatDate(participant.birth_date)}${age !== null ? ` (${age} anos no retiro)` : ''}`}
            />
          )}
          {participant.phone && (
            <InfoRow icon={<Phone className="w-4 h-4" />} label="WhatsApp / Telefone" value={formatPhone(participant.phone)} />
          )}
          {participant.email && (
            <InfoRow icon={<Mail className="w-4 h-4" />} label="E-mail" value={participant.email} />
          )}
          {participant.congregation && (
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Congregação" value={participant.congregation} />
          )}
          {participant.locality && (
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Localidade" value={participant.locality} />
          )}
          {participant.is_resident !== null && (
            <InfoRow
              icon={<Home className="w-4 h-4" />}
              label="Alojamento (Interno)"
              value={participant.is_resident ? 'Sim — ficará interno' : 'Não — externo'}
            />
          )}
          {participant.notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-text-tertiary mb-1">Observações</p>
              <p className="text-sm text-text-secondary">{participant.notes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Shirt Confirmation Card (Sim / Não) */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Shirt className="w-5 h-5 text-primary-600" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Confirmação de Camisa</h2>
              <p className="text-xs text-text-secondary">
                Comprou camisa?{' '}
                <strong className={participant.shirt_purchased ? 'text-emerald-700' : 'text-slate-700'}>
                  {participant.shirt_purchased ? 'Sim' : 'Não'}
                </strong>
                {participant.shirt_purchased && participant.shirt_size
                  ? ` • Tamanho ${participant.shirt_size}`
                  : ''}
              </p>
            </div>
          </div>

          {writable && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={participant.shirt_purchased ? 'primary' : 'secondary'}
                loading={savingShirt}
                onClick={() => handleToggleShirt(true)}
              >
                Sim
              </Button>
              <Button
                size="sm"
                variant={!participant.shirt_purchased ? 'danger' : 'secondary'}
                loading={savingShirt}
                onClick={() => handleToggleShirt(false, null)}
              >
                Não
              </Button>
              {participant.shirt_purchased && (
                <select
                  aria-label="Tamanho da camisa"
                  value={participant.shirt_size ?? ''}
                  disabled={savingShirt}
                  onChange={(e) => handleToggleShirt(true, (e.target.value || null) as ShirtSize | null)}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold bg-white"
                >
                  <option value="">Tamanho (opc.)</option>
                  {SHIRT_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Guardian Info */}
      {participant.guardian && (
        <Card>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-600" />
              Responsável
            </h2>
            {waGuardian && (
              <a
                href={waGuardian}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp do Resp.
              </a>
            )}
          </div>
          <div className="space-y-3">
            <InfoRow icon={<UserIcon className="w-4 h-4" />} label="Nome" value={participant.guardian.full_name} />
            <InfoRow label="Parentesco" value={participant.guardian.relationship} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={formatPhone(participant.guardian.phone)} />
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
          <InfoRow label="Cadastro" value={formatDateTime(participant.registered_at ?? participant.created_at)} />
          <InfoRow label="Última atualização" value={formatDateTime(participant.updated_at)} />
        </div>
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

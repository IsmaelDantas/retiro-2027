import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { fetchParticipant, createParticipant, updateParticipant } from '../services/participants';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { Button } from '../components/ui/Button';
import { DetailSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../contexts/ToastContext';
import type { ParticipantFormData, ParticipantStatus } from '../types/database';

const INITIAL_FORM: ParticipantFormData = {
  full_name: '',
  birth_date: '',
  phone: '',
  email: '',
  congregation: '',
  notes: '',
  status: 'pending',
  guardian_full_name: '',
  guardian_relationship: '',
  guardian_phone: '',
  guardian_email: '',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'Pai', label: 'Pai' },
  { value: 'Mãe', label: 'Mãe' },
  { value: 'Avô', label: 'Avô' },
  { value: 'Avó', label: 'Avó' },
  { value: 'Tio(a)', label: 'Tio(a)' },
  { value: 'Irmão(ã)', label: 'Irmão(ã)' },
  { value: 'Outro', label: 'Outro' },
];

export function ParticipantFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<ParticipantFormData>(INITIAL_FORM);
  const [existingGuardianId, setExistingGuardianId] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ParticipantFormData, string>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      loadParticipant(id);
    }
  }, [id, isEdit]);

  const loadParticipant = async (participantId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchParticipant(participantId);
      if (!data) {
        setLoadError('Participante não encontrado.');
        return;
      }

      setFormData({
        full_name: data.full_name,
        birth_date: data.birth_date ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        congregation: data.congregation ?? '',
        notes: data.notes ?? '',
        status: data.status,
        guardian_full_name: data.guardian?.full_name ?? '',
        guardian_relationship: data.guardian?.relationship ?? '',
        guardian_phone: data.guardian?.phone ?? '',
        guardian_email: data.guardian?.email ?? '',
      });
      setExistingGuardianId(data.guardian?.id ?? null);
    } catch {
      setLoadError('Não foi possível carregar os dados do participante.');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ParticipantFormData, string>> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome do participante é obrigatório.';
    }

    if (!formData.guardian_full_name.trim()) {
      newErrors.guardian_full_name = 'Nome do responsável é obrigatório.';
    }

    if (!formData.guardian_relationship.trim()) {
      newErrors.guardian_relationship = 'Parentesco é obrigatório.';
    }

    if (!formData.guardian_phone.trim()) {
      newErrors.guardian_phone = 'Telefone do responsável é obrigatório.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof ParticipantFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    if (submitting) return; // Prevent double submit

    setSubmitting(true);
    try {
      if (isEdit && id) {
        await updateParticipant(id, formData, existingGuardianId);
        showToast('Participante atualizado com sucesso.');
        navigate(`/participants/${id}`, { replace: true });
      } else {
        const newParticipant = await createParticipant(formData);
        showToast('Participante cadastrado com sucesso.');
        navigate(`/participants/${newParticipant.id}`, { replace: true });
      }
    } catch {
      showToast(
        isEdit
          ? 'Não foi possível atualizar o participante. Tente novamente.'
          : 'Não foi possível cadastrar o participante. Tente novamente.',
        'error'
      );
    } finally {
      setSubmitting(false);
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

  if (loadError) {
    return (
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <ErrorState message={loadError} />
      </div>
    );
  }

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

      <h1 className="text-xl font-bold text-text-primary">
        {isEdit ? 'Editar Participante' : 'Nova Inscrição'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Participant Data */}
        <section className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
            Dados do Participante
          </h2>

          <Input
            label="Nome completo"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            error={errors.full_name}
            required
            placeholder="Ex: João Silva"
          />

          <Input
            label="Data de nascimento"
            type="date"
            value={formData.birth_date}
            onChange={(e) => handleChange('birth_date', e.target.value)}
          />

          <Input
            label="Telefone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="(00) 00000-0000"
          />

          <Input
            label="E-mail"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="email@exemplo.com"
          />

          <Input
            label="Congregação"
            value={formData.congregation}
            onChange={(e) => handleChange('congregation', e.target.value)}
            placeholder="Ex: Igreja Central"
          />

          <TextArea
            label="Observações"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Alguma observação sobre o participante..."
          />
        </section>

        {/* Guardian Data */}
        <section className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
            Dados do Responsável
          </h2>

          <Input
            label="Nome completo"
            value={formData.guardian_full_name}
            onChange={(e) => handleChange('guardian_full_name', e.target.value)}
            error={errors.guardian_full_name}
            required
            placeholder="Ex: Maria Silva"
            id="guardian-full-name"
          />

          <Select
            label="Grau de parentesco"
            value={formData.guardian_relationship}
            onChange={(e) => handleChange('guardian_relationship', e.target.value)}
            error={errors.guardian_relationship}
            options={RELATIONSHIP_OPTIONS}
            required
            id="guardian-relationship"
          />

          <Input
            label="Telefone"
            type="tel"
            value={formData.guardian_phone}
            onChange={(e) => handleChange('guardian_phone', e.target.value)}
            error={errors.guardian_phone}
            required
            placeholder="(00) 00000-0000"
            id="guardian-phone"
          />

          <Input
            label="E-mail"
            type="email"
            value={formData.guardian_email}
            onChange={(e) => handleChange('guardian_email', e.target.value)}
            placeholder="email@exemplo.com"
            id="guardian-email"
          />
        </section>

        {/* Registration Data */}
        <section className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
            Dados da Inscrição
          </h2>

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as ParticipantStatus)}
            options={STATUS_OPTIONS}
            id="inscription-status"
          />
        </section>

        {/* LGPD Notice */}
        <p className="text-xs text-text-tertiary text-center px-2">
          Os dados coletados serão utilizados exclusivamente para a organização do Retiro de Jovens 2027.
        </p>

        {/* Submit */}
        <Button
          type="submit"
          loading={submitting}
          className="w-full"
          size="lg"
        >
          <Save className="w-4 h-4" />
          {isEdit ? 'Salvar alterações' : 'Cadastrar inscrição'}
        </Button>
      </form>
    </div>
  );
}

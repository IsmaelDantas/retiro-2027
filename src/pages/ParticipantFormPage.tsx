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
import { useAuth } from '../contexts/AuthContext';
import { canManageData } from '../utils/permissions';
import { isMinorAtRetreat } from '../utils/date';
import { SHIRT_SIZES } from '../utils/payment';
import type { ParticipantFormData, ParticipantStatus, ShirtSize } from '../types/database';

const INITIAL_FORM: ParticipantFormData = {
  full_name: '',
  birth_date: '',
  phone: '',
  email: '',
  congregation: '',
  locality: '',
  is_resident: '',
  shirt_purchased: false,
  shirt_size: '',
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
  const { profile } = useAuth();
  const writable = canManageData(profile?.role);

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
        locality: data.locality ?? '',
        is_resident: data.is_resident === true ? 'yes' : data.is_resident === false ? 'no' : '',
        shirt_purchased: Boolean(data.shirt_purchased),
        shirt_size: data.shirt_size ?? '',
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

  const minorRequired = isMinorAtRetreat(formData.birth_date);
  const guardianPartiallyFilled = Boolean(
    formData.guardian_full_name.trim() ||
      formData.guardian_relationship.trim() ||
      formData.guardian_phone.trim() ||
      formData.guardian_email.trim()
  );
  const guardianRequired = minorRequired || guardianPartiallyFilled;

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ParticipantFormData, string>> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome do participante é obrigatório.';
    }

    if (guardianRequired) {
      if (!formData.guardian_full_name.trim()) {
        newErrors.guardian_full_name = minorRequired
          ? 'Nome do responsável é obrigatório para menores de 18 anos.'
          : 'Informe o nome do responsável.';
      }

      if (!formData.guardian_relationship.trim()) {
        newErrors.guardian_relationship = 'Parentesco é obrigatório.';
      }

      if (!formData.guardian_phone.trim()) {
        newErrors.guardian_phone = minorRequired
          ? 'Telefone do responsável é obrigatório para menores de 18 anos.'
          : 'Informe o telefone do responsável.';
      }
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

  if (!writable) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="bg-white rounded-xl border border-border p-6 text-center space-y-2">
          <h1 className="text-lg font-bold text-text-primary">Acesso somente leitura</h1>
          <p className="text-sm text-text-secondary">
            Seu perfil atual permite apenas consultar informações. Somente administradores e coordenadores podem cadastrar ou editar participantes.
          </p>
        </div>
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
            placeholder="Ex: Templo Central"
          />

          <Input
            label="Localidade (sítio, distrito, bairro)"
            value={formData.locality ?? ''}
            onChange={(e) => handleChange('locality', e.target.value)}
            placeholder="Ex: Centro"
          />

          <Select
            label="Ficará interno nos dias do retiro?"
            value={formData.is_resident ?? ''}
            onChange={(e) => handleChange('is_resident', e.target.value)}
            options={[
              { value: '', label: 'Não informado' },
              { value: 'yes', label: 'Sim (ficará interno)' },
              { value: 'no', label: 'Não (externo)' },
            ]}
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
          <div className="border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Dados do Responsável {minorRequired ? '(Obrigatório para menores)' : '(Opcional para maiores de 18)'}
            </h2>
          </div>

          <Input
            label="Nome completo"
            value={formData.guardian_full_name}
            onChange={(e) => handleChange('guardian_full_name', e.target.value)}
            error={errors.guardian_full_name}
            required={guardianRequired}
            placeholder="Ex: Maria Silva"
            id="guardian-full-name"
          />

          <Select
            label="Grau de parentesco"
            value={formData.guardian_relationship}
            onChange={(e) => handleChange('guardian_relationship', e.target.value)}
            error={errors.guardian_relationship}
            options={RELATIONSHIP_OPTIONS}
            required={guardianRequired}
            id="guardian-relationship"
          />

          <Input
            label="Telefone"
            type="tel"
            value={formData.guardian_phone}
            onChange={(e) => handleChange('guardian_phone', e.target.value)}
            error={errors.guardian_phone}
            required={guardianRequired}
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

        {/* Registration & Shirt Data */}
        <section className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
            Inscrição e Camisa
          </h2>

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as ParticipantStatus)}
            options={STATUS_OPTIONS}
            id="inscription-status"
          />

          <Select
            label="Comprou camisa?"
            value={formData.shirt_purchased ? 'yes' : 'no'}
            onChange={(e) => {
              const purchased = e.target.value === 'yes';
              setFormData((prev) => ({
                ...prev,
                shirt_purchased: purchased,
                shirt_size: purchased ? prev.shirt_size : '',
              }));
            }}
            options={[
              { value: 'no', label: 'Não' },
              { value: 'yes', label: 'Sim' },
            ]}
            id="shirt-purchased"
          />

          {formData.shirt_purchased && (
            <Select
              label="Tamanho da camisa (opcional)"
              value={formData.shirt_size ?? ''}
              onChange={(e) => handleChange('shirt_size', e.target.value as ShirtSize | '')}
              options={[
                { value: '', label: 'Não informado' },
                ...SHIRT_SIZES.map((sz) => ({ value: sz, label: sz })),
              ]}
              id="shirt-size"
            />
          )}
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

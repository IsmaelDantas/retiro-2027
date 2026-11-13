import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit,
  ListPlus,
  Plus,
  RotateCcw,
  Shirt,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import {
  batchCreateUnpaidPayments,
  calculatePaymentSummary,
  createPayment,
  deletePayment,
  fetchPaymentsWithParticipants,
  isPaymentsTableMissingError,
  markPaymentAsPaid,
  markPaymentAsUnpaid,
  updatePayment,
} from '../services/payments';
import { PaymentBadge } from '../components/payments/PaymentBadge';
import { PaymentModal } from '../components/payments/PaymentModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/date';
import { downloadCSV, paymentsToCSV } from '../utils/csv';
import {
  PAYMENT_CATEGORY_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  SHIRT_SIZES,
  formatCurrency,
  getPaymentCategoryLabel,
  getPaymentMethodLabel,
} from '../utils/payment';
import type {
  ParticipantWithGuardian,
  Payment,
  PaymentCategory,
  PaymentFormData,
  PaymentStatus,
  PaymentWithParticipant,
  ShirtSize,
} from '../types/database';

export function PaymentsPage() {
  const { showToast } = useToast();

  const [payments, setPayments] = useState<PaymentWithParticipant[]>([]);
  const [participants, setParticipants] = useState<ParticipantWithGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<PaymentCategory | 'all'>('shirt');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [sizeFilter, setSizeFilter] = useState<ShirtSize | 'all'>('all');
  const [search, setSearch] = useState('');

  // Modals & actions
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [preselectedParticipantId, setPreselectedParticipantId] = useState('');
  const [deletingPayment, setDeletingPayment] = useState<PaymentWithParticipant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Batch generation modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchAmount, setBatchAmount] = useState('45.00');
  const [batchDescription, setBatchDescription] = useState('Blusa Retiro 2027');
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTableMissing(false);
    try {
      const data = await fetchPaymentsWithParticipants();
      setPayments(data.payments);
      setParticipants(data.participants);
    } catch (err) {
      if (isPaymentsTableMissingError(err)) {
        setTableMissing(true);
      } else {
        setError('Não foi possível carregar os pagamentos. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Payments matching active category
  const categoryPayments = useMemo(() => {
    if (categoryFilter === 'all') return payments;
    return payments.filter((p) => p.category === categoryFilter);
  }, [payments, categoryFilter]);

  // Summary for active category
  const summary = useMemo(() => calculatePaymentSummary(categoryPayments), [categoryPayments]);

  // Participants who don't yet have a payment in the selected category (non-cancelled)
  const missingParticipants = useMemo(() => {
    if (categoryFilter === 'all' || categoryFilter === 'other') return [];
    const registeredIds = new Set(categoryPayments.map((p) => p.participant_id));
    let missing = participants.filter(
      (part) => part.status !== 'cancelled' && !registeredIds.has(part.id)
    );
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      missing = missing.filter(
        (part) =>
          part.full_name.toLowerCase().includes(s) ||
          part.guardian?.full_name.toLowerCase().includes(s) ||
          part.congregation?.toLowerCase().includes(s)
      );
    }
    return missing;
  }, [participants, categoryPayments, categoryFilter, search]);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    let result = categoryPayments;

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (sizeFilter !== 'all' && (categoryFilter === 'shirt' || categoryFilter === 'all')) {
      result = result.filter((p) => p.shirt_size === sizeFilter);
    }

    if (search.trim()) {
      const s = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.participant?.full_name.toLowerCase().includes(s) ||
          p.participant?.guardian?.full_name.toLowerCase().includes(s) ||
          p.participant?.congregation?.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s)
      );
    }

    return result;
  }, [categoryPayments, statusFilter, sizeFilter, categoryFilter, search]);

  const handleOpenCreate = (participantId = '') => {
    setEditingPayment(null);
    setPreselectedParticipantId(participantId);
    setModalOpen(true);
  };

  const handleOpenEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setPreselectedParticipantId(payment.participant_id);
    setModalOpen(true);
  };

  const handleSavePayment = async (formData: PaymentFormData, editing?: Payment | null) => {
    if (editing) {
      await updatePayment(editing.id, formData, editing.paid_at);
      showToast('Pagamento atualizado com sucesso.');
    } else {
      await createPayment(formData);
      showToast('Pagamento registrado com sucesso.');
    }
    await loadData();
  };

  const handleQuickMarkPaid = async (payment: PaymentWithParticipant) => {
    setBusyId(payment.id);
    try {
      await markPaymentAsPaid(payment.id, payment.amount, payment.payment_method ?? 'pix');
      showToast(`${payment.participant?.full_name ?? 'Participante'} marcado como pago!`);
      await loadData();
    } catch {
      showToast('Não foi possível atualizar o pagamento.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickMarkUnpaid = async (payment: PaymentWithParticipant) => {
    setBusyId(payment.id);
    try {
      await markPaymentAsUnpaid(payment.id);
      showToast('Pagamento marcado como não pago.');
      await loadData();
    } catch {
      showToast('Não foi possível atualizar o pagamento.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPayment) return;
    setDeleting(true);
    try {
      await deletePayment(deletingPayment.id);
      showToast('Registro de pagamento excluído.');
      setDeletingPayment(null);
      await loadData();
    } catch {
      showToast('Erro ao excluir pagamento.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenBatchModal = () => {
    const cat = categoryFilter === 'registration' ? 'registration' : 'shirt';
    setBatchDescription(cat === 'shirt' ? 'Blusa Retiro 2027' : 'Inscrição Retiro 2027');
    setBatchAmount(cat === 'shirt' ? '45.00' : '150.00');
    setBatchModalOpen(true);
  };

  const handleBatchGenerate = async () => {
    if (missingParticipants.length === 0) return;
    const targetCategory: PaymentCategory =
      categoryFilter === 'registration' ? 'registration' : 'shirt';
    const parsedAmount = Number(batchAmount.replace(',', '.')) || 0;

    setBatchSubmitting(true);
    try {
      await batchCreateUnpaidPayments(
        missingParticipants.map((p) => p.id),
        targetCategory,
        batchDescription,
        parsedAmount
      );
      showToast(`${missingParticipants.length} registro(s) gerados com sucesso.`);
      setBatchModalOpen(false);
      await loadData();
    } catch {
      showToast('Erro ao gerar lista de pagamentos.', 'error');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const includeMissing =
      (statusFilter === 'all' || statusFilter === 'unpaid') &&
      sizeFilter === 'all' &&
      (categoryFilter === 'shirt' || categoryFilter === 'registration');

    const unpaidList = includeMissing ? missingParticipants : [];
    if (filteredPayments.length === 0 && unpaidList.length === 0) {
      showToast('Não há dados para exportar com os filtros atuais.', 'info');
      return;
    }

    const catLabel =
      categoryFilter === 'registration'
        ? 'Inscrição'
        : categoryFilter === 'shirt'
          ? 'Blusa'
          : 'Outro';

    const csv = paymentsToCSV(filteredPayments, unpaidList, catLabel);
    const suffix = categoryFilter !== 'all' ? `-${categoryFilter}` : '';
    downloadCSV(csv, `retiro-2027-pagamentos${suffix}.csv`);
    showToast('Lista de pagamentos exportada em CSV.');
  };

  const defaultModalCategory: PaymentCategory =
    categoryFilter === 'all' ? 'shirt' : categoryFilter;
  const defaultModalAmount = defaultModalCategory === 'registration' ? '150.00' : '45.00';

  if (tableMissing) {
    return (
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Pagamentos & Blusas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Controle financeiro de blusas e inscrições do Retiro 2027
          </p>
        </div>

        <Card className="p-6 border-amber-200 bg-amber-50/60 space-y-3">
          <div className="flex items-start gap-3">
            <Wallet className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">
                Configuração pendente no Supabase
              </h2>
              <p className="text-sm text-slate-700">
                A tabela <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono text-xs">public.payments</code> ainda
                não foi criada no banco de dados Supabase.
              </p>
              <p className="text-sm text-slate-700">
                Acesse o <strong>SQL Editor</strong> no painel do Supabase e execute o script{' '}
                <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono text-xs">
                  supabase/migration_payments.sql
                </code>{' '}
                para ativar o controle de pagamentos e lista de blusas.
              </p>
              <div className="pt-2">
                <Button size="sm" onClick={loadData}>
                  Já executei, tentar novamente
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Pagamentos & Blusas
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Controle de quem pagou e quem não pagou no Retiro 2027
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={loading}>
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={() => handleOpenCreate()}>
            <Plus className="w-4 h-4" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Categoria de pagamento">
        {PAYMENT_CATEGORY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            role="tab"
            aria-selected={categoryFilter === opt.value}
            onClick={() => {
              setCategoryFilter(opt.value);
              if (opt.value !== 'shirt' && opt.value !== 'all') {
                setSizeFilter('all');
              }
            }}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer border
              ${
                categoryFilter === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50'
              }
            `}
          >
            {opt.value === 'shirt' && <Shirt className="w-4 h-4" />}
            {opt.value === 'registration' && <CreditCard className="w-4 h-4" />}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-lg sm:text-xl font-black text-emerald-700 tracking-tight">
                  {formatCurrency(summary.total_collected)}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-3">
                Total Arrecadado
              </p>
            </Card>

            <Card className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-rose-600" />
                </div>
                <span className="text-lg sm:text-xl font-black text-rose-700 tracking-tight">
                  {formatCurrency(summary.total_pending)}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-3">
                Falta Receber
              </p>
            </Card>

            <Card className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-2xl font-black text-slate-900">{summary.paid_count}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-3">
                Pagos
              </p>
            </Card>

            <Card className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-2xl font-black text-slate-900">
                  {summary.unpaid_count + summary.partial_count}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-3">
                Pendentes / Parciais
              </p>
            </Card>
          </div>

          {/* Shirt Sizes Summary Bar */}
          {(categoryFilter === 'shirt' || categoryFilter === 'all') && summary.shirt_count > 0 && (
            <Card className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Shirt className="w-4 h-4 text-indigo-600" />
                  Grade de Blusas ({summary.shirt_count} pedida{summary.shirt_count !== 1 ? 's' : ''})
                </span>
                {sizeFilter !== 'all' && (
                  <button
                    onClick={() => setSizeFilter('all')}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Limpar tamanho
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSizeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    sizeFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todos ({summary.shirt_count})
                </button>
                {SHIRT_SIZES.map((size) => {
                  const count = summary.shirt_sizes[size] ?? 0;
                  return (
                    <button
                      key={size}
                      onClick={() => setSizeFilter(sizeFilter === size ? 'all' : size)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        sizeFilter === size
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {size}: {count}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Search & Status Filters */}
          <div className="space-y-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por participante, responsável ou congregação..."
            />
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Filtrar por situação">
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  role="tab"
                  aria-selected={statusFilter === opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer border
                    ${
                      statusFilter === opt.value
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Registered Payments List */}
          {filteredPayments.length === 0 ? (
            <EmptyState
              title="Nenhum pagamento encontrado"
              description={
                search || statusFilter !== 'all' || sizeFilter !== 'all'
                  ? 'Tente ajustar os filtros ou termos da pesquisa.'
                  : 'Registre um pagamento individualmente ou gere a lista para os participantes.'
              }
              icon={<Wallet className="w-8 h-8 text-slate-400" />}
              action={
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" onClick={() => handleOpenCreate()}>
                    <Plus className="w-4 h-4" />
                    Registrar Pagamento
                  </Button>
                  {missingParticipants.length > 0 && (
                    <Button variant="secondary" size="sm" onClick={handleOpenBatchModal}>
                      <ListPlus className="w-4 h-4" />
                      Gerar Lista ({missingParticipants.length})
                    </Button>
                  )}
                </div>
              }
            />
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-3 lg:hidden">
                {filteredPayments.map((p) => {
                  const remaining = Math.max(0, p.amount - p.paid_amount);
                  const isBusy = busyId === p.id;
                  return (
                    <Card key={p.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/participants/${p.participant_id}`}
                            className="text-base font-bold text-slate-900 hover:text-indigo-600 truncate block"
                          >
                            {p.participant?.full_name ?? 'Participante'}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">
                              {p.description || getPaymentCategoryLabel(p.category)}
                            </span>
                            {p.shirt_size && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                                Tam: {p.shirt_size}
                              </span>
                            )}
                            {p.participant?.congregation && (
                              <span>• {p.participant.congregation}</span>
                            )}
                          </div>
                        </div>
                        <PaymentBadge status={p.status} />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">
                            {formatCurrency(p.paid_amount)}
                          </span>{' '}
                          <span className="text-slate-500">de {formatCurrency(p.amount)}</span>
                          {remaining > 0 && (
                            <span className="block text-rose-600 font-semibold mt-0.5">
                              Falta {formatCurrency(remaining)}
                            </span>
                          )}
                        </div>
                        <div className="text-right text-slate-500">
                          {p.payment_method && (
                            <span className="font-semibold text-slate-700 block">
                              {getPaymentMethodLabel(p.payment_method)}
                            </span>
                          )}
                          {p.paid_at && <span>{formatDate(p.paid_at)}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {p.status !== 'paid' ? (
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            loading={isBusy}
                            onClick={() => handleQuickMarkPaid(p)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Marcar Pago
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            loading={isBusy}
                            onClick={() => handleQuickMarkUnpaid(p)}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Desmarcar
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(p)}
                          aria-label="Editar pagamento"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingPayment(p)}
                          aria-label="Excluir pagamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4">
                        Participante
                      </th>
                      <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4">
                        Item / Blusa
                      </th>
                      <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4">
                        Valor Pago
                      </th>
                      <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4">
                        Forma / Data
                      </th>
                      <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4">
                        Status
                      </th>
                      <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4 text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((p) => {
                      const remaining = Math.max(0, p.amount - p.paid_amount);
                      const isBusy = busyId === p.id;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <Link
                              to={`/participants/${p.participant_id}`}
                              className="text-sm font-bold text-slate-900 hover:text-indigo-600 block"
                            >
                              {p.participant?.full_name ?? 'Participante'}
                            </Link>
                            {p.participant?.guardian && (
                              <span className="text-xs text-slate-500">
                                Resp: {p.participant.guardian.full_name}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-700">
                                {p.description || getPaymentCategoryLabel(p.category)}
                              </span>
                              {p.shirt_size && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                                  {p.shirt_size}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900">
                              {formatCurrency(p.paid_amount)}{' '}
                              <span className="text-xs font-normal text-slate-500">
                                / {formatCurrency(p.amount)}
                              </span>
                            </p>
                            {remaining > 0 && (
                              <p className="text-xs font-semibold text-rose-600">
                                Falta {formatCurrency(remaining)}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            <span className="font-medium block">
                              {getPaymentMethodLabel(p.payment_method)}
                            </span>
                            {p.paid_at && (
                              <span className="text-xs text-slate-400">{formatDate(p.paid_at)}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <PaymentBadge status={p.status} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {p.status !== 'paid' ? (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs"
                                  loading={isBusy}
                                  onClick={() => handleQuickMarkPaid(p)}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Pagar
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="px-3 py-1.5 text-xs"
                                  loading={isBusy}
                                  onClick={() => handleQuickMarkUnpaid(p)}
                                  title="Marcar como não pago"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                size="sm"
                                className="px-2.5 py-1.5"
                                onClick={() => handleOpenEdit(p)}
                                title="Editar"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="px-2.5 py-1.5"
                                onClick={() => setDeletingPayment(p)}
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Missing Participants Checklist ("Quem ainda não pagou / sem registro") */}
          {(categoryFilter === 'shirt' || categoryFilter === 'registration') &&
            (statusFilter === 'all' || statusFilter === 'unpaid') &&
            sizeFilter === 'all' &&
            missingParticipants.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Sem registro em {categoryFilter === 'shirt' ? 'Blusas' : 'Inscrições'} (
                      {missingParticipants.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Participantes ativos que ainda não possuem pedido ou pagamento nesta lista.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleOpenBatchModal}>
                    <ListPlus className="w-4 h-4" />
                    Gerar cobrança para todos ({missingParticipants.length})
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {missingParticipants.map((part) => (
                    <Card key={part.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/participants/${part.id}`}
                          className="text-sm font-bold text-slate-900 hover:text-indigo-600 truncate block"
                        >
                          {part.full_name}
                        </Link>
                        <p className="text-xs text-slate-500 truncate">
                          {part.congregation || part.guardian?.full_name || 'Sem observações'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-shrink-0 text-xs"
                        onClick={() => handleOpenCreate(part.id)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Registrar
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
        </>
      )}

      {/* Create / Edit Payment Modal */}
      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePayment}
        participants={participants}
        editingPayment={editingPayment}
        defaultParticipantId={preselectedParticipantId}
        defaultCategory={defaultModalCategory}
        defaultAmount={defaultModalAmount}
      />

      {/* Batch Generate Modal */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="Gerar Lista de Pagamento"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Será criado um registro <strong>Não pago</strong> para os{' '}
            <strong>{missingParticipants.length}</strong> participante(s) sem lançamento em{' '}
            <strong>{categoryFilter === 'registration' ? 'Inscrições' : 'Blusas'}</strong>.
          </p>
          <Input
            label="Descrição"
            value={batchDescription}
            onChange={(e) => setBatchDescription(e.target.value)}
            id="batch-description"
          />
          <Input
            label="Valor padrão (R$)"
            type="number"
            step="0.01"
            min="0"
            value={batchAmount}
            onChange={(e) => setBatchAmount(e.target.value)}
            id="batch-amount"
          />
          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setBatchModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={batchSubmitting} onClick={handleBatchGenerate}>
              Gerar {missingParticipants.length} registro(s)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingPayment)}
        onClose={() => setDeletingPayment(null)}
        title="Excluir Pagamento"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Deseja excluir o registro de pagamento de{' '}
            <strong>{deletingPayment?.participant?.full_name ?? 'este participante'}</strong>? Esta
            ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setDeletingPayment(null)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

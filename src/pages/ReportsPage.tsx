import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Wallet } from 'lucide-react';
import { fetchParticipants } from '../services/participants';
import { fetchPaymentsWithParticipants, isPaymentsTableMissingError } from '../services/payments';
import { participantsToCSV, paymentsToCSV, downloadCSV } from '../utils/csv';
import { PAYMENT_CATEGORY_OPTIONS, PAYMENT_STATUS_OPTIONS } from '../utils/payment';
import { StatusFilter } from '../components/ui/StatusFilter';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../contexts/ToastContext';
import type {
  ParticipantStatus,
  ParticipantWithGuardian,
  PaymentCategory,
  PaymentStatus,
  PaymentWithParticipant,
} from '../types/database';

export function ReportsPage() {
  const { showToast } = useToast();

  const [participants, setParticipants] = useState<ParticipantWithGuardian[]>([]);
  const [payments, setPayments] = useState<PaymentWithParticipant[]>([]);
  const [paymentsTableMissing, setPaymentsTableMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | 'all'>('all');
  const [paymentCategoryFilter, setPaymentCategoryFilter] = useState<PaymentCategory | 'all'>('shirt');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [exporting, setExporting] = useState(false);

  const loadParticipants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchParticipants();
      setParticipants(data);
      try {
        const payData = await fetchPaymentsWithParticipants();
        setPayments(payData.payments);
        setPaymentsTableMissing(false);
      } catch (payErr) {
        if (isPaymentsTableMissingError(payErr)) {
          setPaymentsTableMissing(true);
        }
      }
    } catch {
      setError('Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  const filteredParticipants =
    statusFilter === 'all'
      ? participants
      : participants.filter((p) => p.status === statusFilter);

  const filteredPayments = payments.filter((p) => {
    if (paymentCategoryFilter !== 'all' && p.category !== paymentCategoryFilter) return false;
    if (paymentStatusFilter !== 'all' && p.status !== paymentStatusFilter) return false;
    return true;
  });

  const handleExport = () => {
    if (filteredParticipants.length === 0) {
      showToast('Não há dados para exportar.', 'info');
      return;
    }

    setExporting(true);
    try {
      const csv = participantsToCSV(filteredParticipants);
      const suffix = statusFilter !== 'all' ? `-${statusFilter}` : '';
      downloadCSV(csv, `retiro-2027-participantes${suffix}.csv`);
      showToast(`${filteredParticipants.length} participante(s) exportados com sucesso.`);
    } catch {
      showToast('Erro ao exportar os dados.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPayments = () => {
    if (filteredPayments.length === 0) {
      showToast('Não há registros de pagamento para exportar.', 'info');
      return;
    }

    setExporting(true);
    try {
      const csv = paymentsToCSV(filteredPayments);
      const suffix = paymentCategoryFilter !== 'all' ? `-${paymentCategoryFilter}` : '';
      downloadCSV(csv, `retiro-2027-pagamentos${suffix}.csv`);
      showToast(`${filteredPayments.length} registro(s) de pagamento exportados.`);
    } catch {
      showToast('Erro ao exportar os pagamentos.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Relatórios</h1>

      {error ? (
        <ErrorState message={error} onRetry={loadParticipants} />
      ) : (
        <>
          {/* Export Card */}
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">
                  Exportar Participantes
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Exporte a lista de participantes em formato CSV. O arquivo pode ser aberto
                  no Excel, Google Sheets ou outro editor de planilhas.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-text-secondary mb-2">
                  Filtrar por status:
                </p>
                <StatusFilter value={statusFilter} onChange={setStatusFilter} />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <p className="text-sm text-text-secondary">
                  {loading ? (
                    'Carregando...'
                  ) : (
                    <>
                      <strong>{filteredParticipants.length}</strong> participante
                      {filteredParticipants.length !== 1 ? 's' : ''} selecionado
                      {filteredParticipants.length !== 1 ? 's' : ''}
                    </>
                  )}
                </p>

                <Button
                  size="sm"
                  onClick={handleExport}
                  loading={exporting}
                  disabled={loading || filteredParticipants.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </Card>

          {/* Export Payments & Shirts Card */}
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">
                  Exportar Pagamentos & Blusas
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Exporte a lista de quem pagou e quem não pagou, incluindo tamanhos de blusas,
                  valores e formas de pagamento.
                </p>
              </div>
            </div>

            {paymentsTableMissing ? (
              <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Execute <code className="font-mono">supabase/migration_payments.sql</code> no Supabase para exportar pagamentos.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">Categoria:</p>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPaymentCategoryFilter(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          paymentCategoryFilter === opt.value
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-border hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">Situação:</p>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPaymentStatusFilter(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          paymentStatusFilter === opt.value
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-border hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <p className="text-sm text-text-secondary">
                    {loading ? (
                      'Carregando...'
                    ) : (
                      <>
                        <strong>{filteredPayments.length}</strong> registro
                        {filteredPayments.length !== 1 ? 's' : ''} encontrado
                        {filteredPayments.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </p>

                  <Button
                    size="sm"
                    onClick={handleExportPayments}
                    loading={exporting}
                    disabled={loading || filteredPayments.length === 0}
                  >
                    <Download className="w-4 h-4" />
                    Exportar Pagamentos CSV
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Info */}
          <Card className="bg-primary-50 border-primary-200">
            <p className="text-xs text-primary-700">
              <strong>Dica:</strong> O arquivo CSV utiliza ponto e vírgula (;) como separador,
              compatível com o padrão brasileiro. Ao abrir no Excel, os dados serão
              organizados corretamente em colunas.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

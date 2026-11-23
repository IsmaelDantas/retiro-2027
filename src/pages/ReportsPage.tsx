import { useState } from 'react';
import { Download, FileSpreadsheet, Shirt } from 'lucide-react';
import { participantsToCSV, shirtsChecklistToCSV, downloadCSV } from '../utils/csv';
import { StatusFilter } from '../components/ui/StatusFilter';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../contexts/ToastContext';
import { useParticipantsData } from '../contexts/ParticipantsDataContext';
import type { ParticipantStatus } from '../types/database';

export function ReportsPage() {
  const { showToast } = useToast();
  const { participants, loading, error, refresh } = useParticipantsData();

  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | 'all'>('all');
  const [shirtFilter, setShirtFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [exporting, setExporting] = useState(false);

  const filteredParticipants =
    statusFilter === 'all'
      ? participants
      : participants.filter((p) => p.status === statusFilter);

  const activeForShirts = participants.filter((p) => {
    if (p.status === 'cancelled') return false;
    if (shirtFilter === 'yes') return p.shirt_purchased;
    if (shirtFilter === 'no') return !p.shirt_purchased;
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

  const handleExportShirts = () => {
    if (activeForShirts.length === 0) {
      showToast('Não há registros de camisas para exportar.', 'info');
      return;
    }

    setExporting(true);
    try {
      const csv = shirtsChecklistToCSV(activeForShirts);
      const suffix = shirtFilter !== 'all' ? `-${shirtFilter}` : '';
      downloadCSV(csv, `retiro-2027-camisas${suffix}.csv`);
      showToast(`${activeForShirts.length} registro(s) exportados.`);
    } catch {
      showToast('Erro ao exportar a lista de camisas.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Relatórios</h1>
        <p className="text-sm text-slate-500">
          Exporte planilhas CSV compatíveis com Excel e LibreOffice.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void refresh(true)} />
      ) : (
        <>
          {/* Export Participants Card */}
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
                  Lista completa com protocolo, congregação, localidade, alojamento, responsável e camisa.
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

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                <p className="text-sm text-text-secondary tabular-nums">
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

          {/* Export Shirts Card (Sim / Não) */}
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Shirt className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">
                  Exportar Confirmação de Camisas (Sim / Não)
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Lista dos inscritos ativos com confirmação de camisa marcada pelo coordenador.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: 'all', label: 'Todos ativos' },
                    { value: 'yes', label: 'Comprou: Sim' },
                    { value: 'no', label: 'Comprou: Não' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setShirtFilter(opt.value)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      shirtFilter === opt.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-slate-700 border-border hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                <p className="text-sm text-text-secondary tabular-nums">
                  {loading ? (
                    'Carregando...'
                  ) : (
                    <>
                      <strong>{activeForShirts.length}</strong> registro
                      {activeForShirts.length !== 1 ? 's' : ''} encontrado
                      {activeForShirts.length !== 1 ? 's' : ''}
                    </>
                  )}
                </p>

                <Button
                  size="sm"
                  onClick={handleExportShirts}
                  loading={exporting}
                  disabled={loading || activeForShirts.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Exportar Camisas CSV
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-primary-50 border-primary-200">
            <p className="text-xs text-primary-700">
              <strong>Dica:</strong> O arquivo CSV utiliza ponto e vírgula (;) como separador e BOM UTF-8,
              abrindo com acentuação correta no Excel e LibreOffice.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

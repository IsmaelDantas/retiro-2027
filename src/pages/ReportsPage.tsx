import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { fetchParticipants } from '../services/participants';
import { participantsToCSV, downloadCSV } from '../utils/csv';
import { StatusFilter } from '../components/ui/StatusFilter';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../contexts/ToastContext';
import type { ParticipantStatus, ParticipantWithGuardian } from '../types/database';

export function ReportsPage() {
  const { showToast } = useToast();

  const [participants, setParticipants] = useState<ParticipantWithGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | 'all'>('all');
  const [exporting, setExporting] = useState(false);

  const loadParticipants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchParticipants();
      setParticipants(data);
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

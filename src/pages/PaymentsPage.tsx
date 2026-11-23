import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Download, MessageCircle, Shirt } from 'lucide-react';
import { fetchParticipants, updateParticipantShirt } from '../services/participants';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { canManageData } from '../utils/permissions';
import { SHIRT_SIZES } from '../utils/payment';
import { downloadCSV, shirtsChecklistToCSV } from '../utils/csv';
import { buildWhatsAppUrl } from '../utils/phone';
import type { ParticipantWithGuardian, ShirtSize } from '../types/database';

type ShirtFilter = 'all' | 'yes' | 'no';

export function PaymentsPage() {
  const { showToast } = useToast();
  const { profile } = useAuth();
  const writable = canManageData(profile?.role);

  const [participants, setParticipants] = useState<ParticipantWithGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shirtFilter, setShirtFilter] = useState<ShirtFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<ShirtSize | 'all'>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchParticipants();
      setParticipants(data.filter((p) => p.status !== 'cancelled'));
    } catch {
      setError('Não foi possível carregar a lista de camisas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    const yesCount = participants.filter((p) => p.shirt_purchased).length;
    const noCount = participants.length - yesCount;
    const sizes = Object.fromEntries(SHIRT_SIZES.map((s) => [s, 0])) as Record<ShirtSize, number>;
    for (const p of participants) {
      if (p.shirt_purchased && p.shirt_size) {
        sizes[p.shirt_size] = (sizes[p.shirt_size] ?? 0) + 1;
      }
    }
    return { yesCount, noCount, total: participants.length, sizes };
  }, [participants]);

  const filteredList = useMemo(() => {
    return participants.filter((p) => {
      if (shirtFilter === 'yes' && !p.shirt_purchased) return false;
      if (shirtFilter === 'no' && p.shirt_purchased) return false;
      if (sizeFilter !== 'all' && p.shirt_size !== sizeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          p.full_name.toLowerCase().includes(q) ||
          p.congregation?.toLowerCase().includes(q) ||
          p.protocol?.toLowerCase().includes(q) ||
          p.guardian?.full_name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [participants, shirtFilter, sizeFilter, search]);

  const handleSetShirt = async (
    participant: ParticipantWithGuardian,
    purchased: boolean,
    size?: ShirtSize | null
  ) => {
    setBusyId(participant.id);
    try {
      const nextSize = purchased ? (size === undefined ? participant.shirt_size : size) : null;
      await updateParticipantShirt(participant.id, purchased, nextSize);
      setParticipants((prev) =>
        prev.map((item) =>
          item.id === participant.id
            ? { ...item, shirt_purchased: purchased, shirt_size: nextSize ?? null }
            : item
        )
      );
      showToast(
        purchased
          ? `Camisa confirmada (Sim) para ${participant.full_name}.`
          : `Camisa marcada como Não para ${participant.full_name}.`
      );
    } catch {
      showToast('Erro ao atualizar confirmação da camisa.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      showToast('Nenhum participante para exportar com os filtros atuais.', 'info');
      return;
    }
    const csv = shirtsChecklistToCSV(filteredList);
    downloadCSV(csv, 'retiro-2027-camisas.csv');
    showToast('Lista de camisas exportada em CSV.');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Controle de Camisas
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Confirmação rápida pelo coordenador: comprou camisa (Sim / Não)
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={loading}>
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 border-emerald-200 bg-emerald-50/40">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-2xl font-black text-emerald-900">{summary.yesCount}</span>
              </div>
              <p className="text-xs font-bold text-emerald-800 mt-2">Comprou (Sim)</p>
            </Card>

            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-2xl font-black text-slate-900">{summary.noCount}</span>
              </div>
              <p className="text-xs font-bold text-slate-600 mt-2">Não comprou</p>
            </Card>

            <Card className="p-4 border-indigo-100 bg-indigo-50/30">
              <div className="flex items-center justify-between">
                <Shirt className="w-5 h-5 text-indigo-600" />
                <span className="text-2xl font-black text-indigo-900">{summary.total}</span>
              </div>
              <p className="text-xs font-bold text-indigo-800 mt-2">Ativos no retiro</p>
            </Card>
          </div>

          {/* Optional size breakdown */}
          {Object.values(summary.sizes).some((v) => v > 0) && (
            <Card className="p-4 space-y-2.5">
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Tamanhos informados (opcional)
              </h2>
              <div className="flex flex-wrap gap-2">
                {SHIRT_SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSizeFilter(sizeFilter === sz ? 'all' : sz)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      sizeFilter === sz
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {sz}: {summary.sizes[sz]}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Filters */}
          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar participante, congregação ou protocolo..."
            />
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: 'all', label: `Todos (${summary.total})` },
                  { value: 'yes', label: `Comprou: Sim (${summary.yesCount})` },
                  { value: 'no', label: `Não comprou (${summary.noCount})` },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setShirtFilter(opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[40px] ${
                    shirtFilter === opt.value
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist */}
          {filteredList.length === 0 ? (
            <EmptyState
              title="Nenhum participante encontrado"
              description="Ajuste os filtros ou cadastre/importe participantes."
              icon={<Shirt className="w-8 h-8 text-slate-400" />}
            />
          ) : (
            <div className="space-y-2.5">
              {filteredList.map((p) => {
                const isBusy = busyId === p.id;
                const waUrl = buildWhatsAppUrl(p.phone ?? p.guardian?.phone);
                return (
                  <Card key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/participants/${p.id}`}
                          className="text-base font-bold text-slate-900 hover:text-indigo-600 truncate"
                        >
                          {p.full_name}
                        </Link>
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                            p.shirt_purchased
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {p.shirt_purchased ? 'Sim' : 'Não'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {p.congregation || 'Sem congregação'}
                        {p.protocol ? ` • Prot. ${p.protocol}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold min-h-[40px]"
                          title="Abrir WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </a>
                      )}

                      {writable && (
                        <>
                          {p.shirt_purchased && (
                            <select
                              aria-label={`Tamanho da camisa de ${p.full_name}`}
                              value={p.shirt_size ?? ''}
                              disabled={isBusy}
                              onChange={(e) =>
                                handleSetShirt(p, true, (e.target.value || null) as ShirtSize | null)
                              }
                              className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white min-h-[40px]"
                            >
                              <option value="">Tam. (opc.)</option>
                              {SHIRT_SIZES.map((sz) => (
                                <option key={sz} value={sz}>
                                  {sz}
                                </option>
                              ))}
                            </select>
                          )}

                          <Button
                            size="sm"
                            variant={p.shirt_purchased ? 'primary' : 'secondary'}
                            loading={isBusy}
                            onClick={() => handleSetShirt(p, true)}
                            className="min-h-[40px]"
                          >
                            Sim
                          </Button>
                          <Button
                            size="sm"
                            variant={!p.shirt_purchased ? 'danger' : 'secondary'}
                            loading={isBusy}
                            onClick={() => handleSetShirt(p, false, null)}
                            className="min-h-[40px]"
                          >
                            Não
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

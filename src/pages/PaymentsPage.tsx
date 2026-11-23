import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Download, MessageCircle, Shirt } from 'lucide-react';
import { updateParticipantShirt } from '../services/participants';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { CardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useParticipantsData } from '../contexts/ParticipantsDataContext';
import { canManageData } from '../utils/permissions';
import { SHIRT_SIZES } from '../utils/payment';
import { downloadCSV, shirtsChecklistToCSV } from '../utils/csv';
import { buildWhatsAppUrl } from '../utils/phone';
import type { ParticipantWithGuardian, ShirtSize } from '../types/database';

type ShirtFilter = 'all' | 'yes' | 'no';

export function PaymentsPage() {
  const { showToast } = useToast();
  const { profile } = useAuth();
  const { participants, loading, error, refresh, patchShirtLocal } = useParticipantsData();
  const writable = canManageData(profile?.role);

  const [shirtFilter, setShirtFilter] = useState<ShirtFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<ShirtSize | 'all'>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeParticipants = useMemo(
    () => participants.filter((p) => p.status !== 'cancelled'),
    [participants]
  );

  const summary = useMemo(() => {
    const yesCount = activeParticipants.filter((p) => p.shirt_purchased).length;
    const noCount = activeParticipants.length - yesCount;
    const sizes = Object.fromEntries(SHIRT_SIZES.map((s) => [s, 0])) as Record<ShirtSize, number>;
    for (const p of activeParticipants) {
      if (p.shirt_purchased && p.shirt_size) {
        sizes[p.shirt_size] = (sizes[p.shirt_size] ?? 0) + 1;
      }
    }
    return { yesCount, noCount, total: activeParticipants.length, sizes };
  }, [activeParticipants]);

  const filteredList = useMemo(() => {
    return activeParticipants.filter((p) => {
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
  }, [activeParticipants, shirtFilter, sizeFilter, search]);

  const handleSetShirt = async (
    participant: ParticipantWithGuardian,
    purchased: boolean,
    size?: ShirtSize | null
  ) => {
    setBusyId(participant.id);
    const nextSize = purchased ? (size === undefined ? participant.shirt_size : size) : null;
    try {
      await updateParticipantShirt(participant.id, purchased, nextSize);
      patchShirtLocal(participant.id, purchased, nextSize ?? null);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Controle de camisas
          </h1>
          <p className="text-sm text-text-secondary">
            Confirmação pelo coordenador se cada participante adquiriu camisa (Sim ou Não).
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={loading}>
          <Download className="w-4 h-4" aria-hidden="true" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary */}
      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void refresh(true)} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3.5 sm:p-4 bg-success-light/60 border-emerald-200">
              <div className="flex items-center justify-between text-success">
                <span className="text-xs font-medium">Comprou (Sim)</span>
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-text-primary tabular-nums mt-1.5">
                {summary.yesCount}
              </p>
            </Card>

            <Card className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-warning">
                <span className="text-xs font-medium text-text-secondary">Não comprou</span>
                <Clock className="w-4 h-4" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-text-primary tabular-nums mt-1.5">
                {summary.noCount}
              </p>
            </Card>

            <Card className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-primary-600">
                <span className="text-xs font-medium text-text-secondary">Ativos</span>
                <Shirt className="w-4 h-4" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-text-primary tabular-nums mt-1.5">
                {summary.total}
              </p>
            </Card>
          </div>

          {Object.values(summary.sizes).some((v) => v > 0) && (
            <Card className="p-4 space-y-2">
              <h2 className="text-xs font-semibold text-text-secondary">
                Tamanhos informados (opcional)
              </h2>
              <div className="flex flex-wrap gap-2">
                {SHIRT_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSizeFilter(sizeFilter === sz ? 'all' : sz)}
                    className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                      sizeFilter === sz
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-text-secondary border-border hover:bg-surface-tertiary'
                    }`}
                  >
                    {sz}: {summary.sizes[sz]}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Filters */}
          <Card className="p-3.5 sm:p-4 space-y-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar participante, congregação ou protocolo…"
            />
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: 'all', label: `Todos (${summary.total})` },
                  { value: 'yes', label: `Sim (${summary.yesCount})` },
                  { value: 'no', label: `Não (${summary.noCount})` },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setShirtFilter(opt.value)}
                  className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                    shirtFilter === opt.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-text-secondary border-border hover:bg-surface-tertiary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Checklist */}
          {filteredList.length === 0 ? (
            <EmptyState
              title="Nenhum participante encontrado"
              description="Ajuste os filtros ou importe novos inscritos."
              icon={<Shirt className="w-8 h-8 text-text-tertiary" />}
            />
          ) : (
            <div className="bg-white rounded-xl border border-border divide-y divide-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {filteredList.map((p) => {
                const isBusy = busyId === p.id;
                const waUrl = buildWhatsAppUrl(p.phone ?? p.guardian?.phone);
                return (
                  <div
                    key={p.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/participants/${p.id}`}
                          className="text-sm sm:text-base font-semibold text-text-primary hover:text-primary-600 truncate"
                        >
                          {p.full_name}
                        </Link>
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                            p.shirt_purchased
                              ? 'bg-success-light text-success border-emerald-200'
                              : 'bg-surface-tertiary text-text-secondary border-border'
                          }`}
                        >
                          {p.shirt_purchased ? 'Sim' : 'Não'}
                        </span>
                      </div>
                      <p className="text-xs text-text-tertiary mt-0.5 truncate">
                        {p.congregation || 'Sem congregação'}
                        {p.protocol ? ` · Protocolo ${p.protocol}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-success-light text-success border border-emerald-200 text-xs font-semibold"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>WhatsApp</span>
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
                              className="px-2.5 py-2 min-h-[40px] rounded-lg border border-border text-xs font-semibold bg-white text-text-primary"
                            >
                              <option value="">Tamanho</option>
                              {SHIRT_SIZES.map((sz) => (
                                <option key={sz} value={sz}>
                                  {sz}
                                </option>
                              ))}
                            </select>
                          )}

                          <div
                            role="group"
                            aria-label={`Camisa de ${p.full_name}`}
                            className="inline-flex rounded-lg border border-border overflow-hidden bg-surface-tertiary p-0.5"
                          >
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleSetShirt(p, true)}
                              className={`px-3.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                                p.shirt_purchased
                                  ? 'bg-success text-white'
                                  : 'text-text-secondary hover:text-text-primary'
                              }`}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleSetShirt(p, false, null)}
                              className={`px-3.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                                !p.shirt_purchased
                                  ? 'bg-white text-text-primary shadow-2xs border border-border'
                                  : 'text-text-secondary hover:text-text-primary'
                              }`}
                            >
                              Não
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

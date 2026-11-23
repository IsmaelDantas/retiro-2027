import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  MessageCircle,
  ShieldAlert,
  Shirt,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useParticipantsData } from '../contexts/ParticipantsDataContext';
import { SearchInput } from '../components/ui/SearchInput';
import { StatusFilter } from '../components/ui/StatusFilter';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { calculateAgeAtRetreat, isMinorAtRetreat } from '../utils/date';
import { isMinorMissingGuardian } from '../utils/dashboardMetrics';
import { buildWhatsAppUrl } from '../utils/phone';
import { canManageData } from '../utils/permissions';
import type { ParticipantStatus } from '../types/database';

type AgeFilter = 'all' | 'minor' | 'adult' | 'missing_guardian';
type ResidentFilter = 'all' | 'yes' | 'no';

export function ParticipantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const { participants, loading, error, refresh } = useParticipantsData();
  const writable = canManageData(profile?.role);

  const initialAge = (searchParams.get('age') as AgeFilter) || 'all';
  const initialCongregation = searchParams.get('congregation') || 'all';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | 'all'>('all');
  const [congregationFilter, setCongregationFilter] = useState<string>(initialCongregation);
  const [ageFilter, setAgeFilter] = useState<AgeFilter>(initialAge);
  const [residentFilter, setResidentFilter] = useState<ResidentFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(
    initialAge !== 'all' || initialCongregation !== 'all'
  );

  const activeAdvancedCount =
    (congregationFilter !== 'all' ? 1 : 0) +
    (ageFilter !== 'all' ? 1 : 0) +
    (residentFilter !== 'all' ? 1 : 0);

  const congregationOptions = useMemo(() => {
    const names = Array.from(
      new Set(participants.map((p) => (p.congregation ?? '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return [
      { value: 'all', label: 'Todas as congregações' },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    let result = participants;

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (congregationFilter !== 'all') {
      result = result.filter((p) => (p.congregation ?? '').trim() === congregationFilter);
    }

    if (ageFilter === 'minor') {
      result = result.filter((p) => isMinorAtRetreat(p.birth_date));
    } else if (ageFilter === 'adult') {
      result = result.filter((p) => p.birth_date && !isMinorAtRetreat(p.birth_date));
    } else if (ageFilter === 'missing_guardian') {
      result = result.filter((p) => isMinorMissingGuardian(p));
    }

    if (residentFilter === 'yes') {
      result = result.filter((p) => p.is_resident === true);
    } else if (residentFilter === 'no') {
      result = result.filter((p) => p.is_resident === false);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.protocol?.toLowerCase().includes(q) ||
          p.guardian?.full_name.toLowerCase().includes(q) ||
          p.congregation?.toLowerCase().includes(q) ||
          p.locality?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [participants, statusFilter, congregationFilter, ageFilter, residentFilter, search]);

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCongregationFilter('all');
    setAgeFilter('all');
    setResidentFilter('all');
    setSearchParams({});
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Lista de inscritos
          </h1>
          <p className="text-sm text-text-secondary tabular-nums">
            {filteredParticipants.length} de {participants.length} participante
            {participants.length !== 1 ? 's' : ''}
          </p>
        </div>

        {writable && (
          <Link
            to="/participants/new"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Nova inscrição</span>
          </Link>
        )}
      </div>

      {/* Compact search + filter bar */}
      <div className="bg-white rounded-xl border border-border p-3.5 sm:p-4 space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar nome, protocolo, congregação ou localidade…"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-lg border text-xs sm:text-sm font-semibold cursor-pointer transition-colors flex-shrink-0 ${
              filtersOpen || activeAdvancedCount > 0
                ? 'bg-primary-50 text-primary-700 border-primary-200'
                : 'bg-white text-text-secondary border-border hover:bg-surface-tertiary'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            <span>Filtros{activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ''}</span>
          </button>
        </div>

        <StatusFilter value={statusFilter} onChange={setStatusFilter} />

        {filtersOpen && (
          <div className="pt-2 border-t border-border space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Congregação"
                value={congregationFilter}
                onChange={(e) => setCongregationFilter(e.target.value)}
                options={congregationOptions}
              />
              <Select
                label="Faixa etária e responsável"
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value as AgeFilter)}
                options={[
                  { value: 'all', label: 'Todas as idades' },
                  { value: 'minor', label: 'Menores de 18 anos' },
                  { value: 'adult', label: 'Adultos (18+ anos)' },
                  { value: 'missing_guardian', label: 'Menores sem responsável' },
                ]}
              />
              <Select
                label="Alojamento"
                value={residentFilter}
                onChange={(e) => setResidentFilter(e.target.value as ResidentFilter)}
                options={[
                  { value: 'all', label: 'Internos e externos' },
                  { value: 'yes', label: 'Somente internos' },
                  { value: 'no', label: 'Somente não internos' },
                ]}
              />
            </div>
            {(activeAdvancedCount > 0 || search || statusFilter !== 'all') && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 py-1 px-2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void refresh(true)} />
      ) : filteredParticipants.length === 0 ? (
        <EmptyState
          title="Nenhum participante encontrado"
          description="Tente limpar os filtros ou ajustar o termo buscado."
          action={
            activeAdvancedCount > 0 || search || statusFilter !== 'all' ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 min-h-[40px] rounded-lg border border-border bg-white text-sm font-semibold text-text-primary hover:bg-surface-tertiary cursor-pointer"
              >
                Limpar filtros
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile & Tablet cards (semantic <article> — no nested <button> around <a>) */}
          <div className="space-y-2.5 lg:hidden">
            {filteredParticipants.map((p) => {
              const age = calculateAgeAtRetreat(p.birth_date);
              const minor = isMinorAtRetreat(p.birth_date);
              const missingGuard = isMinorMissingGuardian(p);
              const waParticipant = buildWhatsAppUrl(p.phone);
              const waGuardian = buildWhatsAppUrl(p.guardian?.phone);

              return (
                <article
                  key={p.id}
                  className="bg-white rounded-xl border border-border p-4 space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/participants/${p.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-surface-tertiary border border-border flex items-center justify-center flex-shrink-0 font-bold text-text-primary text-sm">
                        {p.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold text-text-primary group-hover:text-primary-600 truncate leading-snug">
                          {p.full_name}
                        </h2>
                        <p className="text-xs text-text-secondary truncate">
                          {p.congregation || 'Congregação não informada'}
                          {p.locality ? ` · ${p.locality}` : ''}
                        </p>
                      </div>
                    </Link>
                    <Badge status={p.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {age !== null && (
                      <span
                        className={`font-medium px-2 py-0.5 rounded-md tabular-nums ${
                          minor
                            ? 'bg-warning-light text-amber-900 border border-amber-200'
                            : 'bg-surface-tertiary text-text-secondary'
                        }`}
                      >
                        {age} anos{minor ? ' · Menor' : ''}
                      </span>
                    )}
                    {p.is_resident !== null && (
                      <span
                        className={`font-medium px-2 py-0.5 rounded-md ${
                          p.is_resident
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'bg-surface-tertiary text-text-secondary'
                        }`}
                      >
                        {p.is_resident ? 'Interno' : 'Externo'}
                      </span>
                    )}
                    {p.shirt_purchased && (
                      <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md bg-success-light text-success border border-emerald-200">
                        <Shirt className="w-3 h-3" aria-hidden="true" />
                        Camisa{p.shirt_size ? ` ${p.shirt_size}` : ''}
                      </span>
                    )}
                    {missingGuard && (
                      <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md bg-danger-light text-danger border border-red-200">
                        <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                        Sem responsável
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border/80">
                    <Link
                      to={`/participants/${p.id}`}
                      className="text-xs font-semibold text-primary-600 hover:underline py-1.5"
                    >
                      Ver ficha completa
                    </Link>

                    <div className="flex items-center gap-2">
                      {waParticipant && (
                        <a
                          href={waParticipant}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-lg bg-success-light text-success border border-emerald-200 text-xs font-semibold"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Jovem</span>
                        </a>
                      )}
                      {waGuardian && (
                        <a
                          href={waGuardian}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-lg bg-primary-50 text-primary-700 border border-primary-200 text-xs font-semibold"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Responsável</span>
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div
            role="region"
            aria-label="Tabela de participantes"
            tabIndex={0}
            className="hidden lg:block bg-white rounded-xl border border-border overflow-x-auto shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-tertiary/60">
                  <th className="text-xs font-semibold text-text-secondary px-5 py-3.5">
                    Participante
                  </th>
                  <th className="text-xs font-semibold text-text-secondary px-4 py-3.5">
                    Idade (06/02)
                  </th>
                  <th className="text-xs font-semibold text-text-secondary px-4 py-3.5">
                    Congregação e alojamento
                  </th>
                  <th className="text-xs font-semibold text-text-secondary px-4 py-3.5">
                    Responsável
                  </th>
                  <th className="text-xs font-semibold text-text-secondary px-4 py-3.5">
                    Camisa
                  </th>
                  <th className="text-xs font-semibold text-text-secondary px-4 py-3.5">
                    WhatsApp
                  </th>
                  <th className="text-xs font-semibold text-text-secondary px-5 py-3.5 text-right">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {filteredParticipants.map((p) => {
                  const age = calculateAgeAtRetreat(p.birth_date);
                  const minor = isMinorAtRetreat(p.birth_date);
                  const waParticipant = buildWhatsAppUrl(p.phone);
                  const waGuardian = buildWhatsAppUrl(p.guardian?.phone);

                  return (
                    <tr key={p.id} className="hover:bg-surface-secondary transition-colors">
                      <td className="px-5 py-3.5">
                        <Link to={`/participants/${p.id}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-full bg-surface-tertiary border border-border font-semibold text-text-primary text-sm flex items-center justify-center flex-shrink-0">
                            {p.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary group-hover:text-primary-600 truncate">
                              {p.full_name}
                            </p>
                            <p className="text-xs text-text-tertiary tabular-nums">
                              {p.protocol ? `Protocolo ${p.protocol}` : p.locality || p.email || '—'}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-sm tabular-nums text-text-primary">
                        {age !== null ? (
                          <span className={minor ? 'text-amber-800 font-semibold' : ''}>
                            {age} anos{minor ? ' (Menor)' : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-secondary">
                        <p className="text-text-primary font-medium">{p.congregation ?? '—'}</p>
                        {p.is_resident !== null && (
                          <span className="text-xs text-text-tertiary">
                            {p.is_resident ? 'Ficará interno' : 'Externo'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-secondary">
                        {p.guardian?.full_name ??
                          (minor ? <span className="text-danger font-medium">Sem responsável</span> : '—')}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold">
                        {p.shirt_purchased ? (
                          <span className="px-2.5 py-1 rounded-md bg-success-light text-success border border-emerald-200">
                            Sim{p.shirt_size ? ` (${p.shirt_size})` : ''}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-surface-tertiary text-text-secondary">
                            Não
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {waParticipant && (
                            <a
                              href={waParticipant}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-md bg-success-light text-success text-xs font-semibold hover:bg-emerald-100"
                            >
                              Jovem
                            </a>
                          )}
                          {waGuardian && (
                            <a
                              href={waGuardian}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-md bg-primary-50 text-primary-700 text-xs font-semibold hover:bg-primary-100"
                            >
                              Responsável
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Badge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

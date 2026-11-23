import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Plus, UserPlus, MessageCircle, ShieldAlert, Shirt } from 'lucide-react';
import { fetchParticipants } from '../services/participants';
import { SearchInput } from '../components/ui/SearchInput';
import { StatusFilter } from '../components/ui/StatusFilter';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { calculateAgeAtRetreat, isMinorAtRetreat } from '../utils/date';
import { isMinorMissingGuardian } from '../utils/dashboardMetrics';
import { buildWhatsAppUrl } from '../utils/phone';
import { useAuth } from '../contexts/AuthContext';
import { canManageData } from '../utils/permissions';
import type { ParticipantStatus, ParticipantWithGuardian } from '../types/database';

type AgeFilter = 'all' | 'minor' | 'adult' | 'missing_guardian';
type ResidentFilter = 'all' | 'yes' | 'no';

export function ParticipantsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const writable = canManageData(profile?.role);

  const initialAge = (searchParams.get('age') as AgeFilter) || 'all';

  const [participants, setParticipants] = useState<ParticipantWithGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | 'all'>('all');
  const [congregationFilter, setCongregationFilter] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>(initialAge);
  const [residentFilter, setResidentFilter] = useState<ResidentFilter>('all');

  const loadParticipants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchParticipants();
      setParticipants(data);
    } catch {
      setError('Não foi possível carregar os participantes. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadParticipants();
  }, []);

  const congregationOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        participants
          .map((p) => (p.congregation ?? '').trim())
          .filter(Boolean)
      )
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
      const searchLower = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.full_name.toLowerCase().includes(searchLower) ||
          p.protocol?.toLowerCase().includes(searchLower) ||
          p.guardian?.full_name.toLowerCase().includes(searchLower) ||
          p.congregation?.toLowerCase().includes(searchLower) ||
          p.locality?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [participants, statusFilter, congregationFilter, ageFilter, residentFilter, search]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Participantes</h1>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">
            {filteredParticipants.length} participante{filteredParticipants.length !== 1 ? 's' : ''} exibido
            {filteredParticipants.length !== 1 ? 's' : ''}
          </p>
        </div>
        {writable && (
          <Link to="/participants/new">
            <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition-all min-h-[44px]">
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span className="hidden sm:inline">Nova Inscrição</span>
            </button>
          </Link>
        )}
      </div>

      {/* Search and Coordinator Filters */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar nome, protocolo, congregação, localidade ou responsável..."
        />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <Select
            label="Congregação"
            value={congregationFilter}
            onChange={(e) => setCongregationFilter(e.target.value)}
            options={congregationOptions}
          />
          <Select
            label="Faixa Etária / Responsável"
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value as AgeFilter)}
            options={[
              { value: 'all', label: 'Todas as idades' },
              { value: 'minor', label: 'Menores (< 18 anos)' },
              { value: 'adult', label: 'Adultos (18+ anos)' },
              { value: 'missing_guardian', label: 'Menores sem responsável' },
            ]}
          />
          <Select
            label="Alojamento (Interno)"
            value={residentFilter}
            onChange={(e) => setResidentFilter(e.target.value as ResidentFilter)}
            options={[
              { value: 'all', label: 'Todos (Internos e Externos)' },
              { value: 'yes', label: 'Somente internos' },
              { value: 'no', label: 'Somente não internos' },
            ]}
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadParticipants} />
      ) : filteredParticipants.length === 0 ? (
        search || statusFilter !== 'all' || congregationFilter !== 'all' || ageFilter !== 'all' || residentFilter !== 'all' ? (
          <EmptyState
            title="Nenhum participante encontrado"
            description="Tente limpar ou alterar os filtros selecionados."
          />
        ) : (
          <EmptyState
            title="Nenhum participante cadastrado"
            description="Comece cadastrando ou importando a lista de participantes do retiro."
            icon={<UserPlus className="w-8 h-8 text-slate-400" />}
            action={
              writable ? (
                <Link to="/participants/new">
                  <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                    Nova Inscrição
                  </button>
                </Link>
              ) : undefined
            }
          />
        )
      ) : (
        <>
          {/* Mobile & Tablet: High contrast spacious Cards */}
          <div className="space-y-3 lg:hidden">
            {filteredParticipants.map((p) => {
              const age = calculateAgeAtRetreat(p.birth_date);
              const minor = isMinorAtRetreat(p.birth_date);
              const missingGuard = isMinorMissingGuardian(p);
              const waParticipant = buildWhatsAppUrl(p.phone);
              const waGuardian = buildWhatsAppUrl(p.guardian?.phone);

              return (
                <Card key={p.id} hoverable onClick={() => navigate(`/participants/${p.id}`)} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 font-extrabold text-slate-800 text-base">
                        {p.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-slate-900 truncate leading-snug">
                          {p.full_name}
                        </p>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {p.congregation || 'Congregação não informada'}
                          {p.locality ? ` • ${p.locality}` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge status={p.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {age !== null && (
                      <span className={`font-semibold px-2 py-0.5 rounded-md ${minor ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'}`}>
                        {age} anos {minor ? '(Menor)' : ''}
                      </span>
                    )}
                    {p.is_resident !== null && (
                      <span className={`font-semibold px-2 py-0.5 rounded-md ${p.is_resident ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'}`}>
                        {p.is_resident ? 'Interno' : 'Externo'}
                      </span>
                    )}
                    {p.shirt_purchased && (
                      <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Shirt className="w-3 h-3" />
                        Camisa{p.shirt_size ? ` (${p.shirt_size})` : ''}
                      </span>
                    )}
                    {missingGuard && (
                      <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        <ShieldAlert className="w-3 h-3" />
                        Sem responsável
                      </span>
                    )}
                  </div>

                  {(waParticipant || waGuardian || p.guardian) && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-600 truncate">
                        {p.guardian ? `Resp: ${p.guardian.full_name}` : 'Contato direto'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {waParticipant && (
                          <a
                            href={waParticipant}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 min-h-[36px]"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Jovem
                          </a>
                        )}
                        {waGuardian && (
                          <a
                            href={waGuardian}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 min-h-[36px]"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Resp.
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4">
                    Participante
                  </th>
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-4 py-4">
                    Idade (06/02)
                  </th>
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-4 py-4">
                    Congregação / Interno
                  </th>
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-4 py-4">
                    Responsável
                  </th>
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-4 py-4">
                    Camisa
                  </th>
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-4 py-4">
                    WhatsApp
                  </th>
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4 text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.map((p) => {
                  const age = calculateAgeAtRetreat(p.birth_date);
                  const minor = isMinorAtRetreat(p.birth_date);
                  const waParticipant = buildWhatsAppUrl(p.phone);
                  const waGuardian = buildWhatsAppUrl(p.guardian?.phone);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/participants/${p.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 font-bold text-slate-700 text-sm flex items-center justify-center">
                            {p.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{p.full_name}</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {p.protocol ? `Prot. ${p.protocol}` : p.locality || p.email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                        {age !== null ? (
                          <span className={minor ? 'text-amber-700' : ''}>
                            {age} anos {minor ? '(Menor)' : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                        <p>{p.congregation ?? '—'}</p>
                        {p.is_resident !== null && (
                          <span className="text-xs text-slate-400">
                            {p.is_resident ? 'Interno' : 'Não interno'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                        {p.guardian?.full_name ?? (minor ? <span className="text-rose-600">Sem responsável</span> : '—')}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold">
                        {p.shirt_purchased ? (
                          <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Sim{p.shirt_size ? ` (${p.shirt_size})` : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600">Não</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          {waParticipant && (
                            <a
                              href={waParticipant}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                            >
                              Jovem
                            </a>
                          )}
                          {waGuardian && (
                            <a
                              href={waGuardian}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100"
                            >
                              Resp.
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
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

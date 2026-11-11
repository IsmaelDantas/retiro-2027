import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, UserPlus } from 'lucide-react';
import { fetchParticipants } from '../services/participants';
import { SearchInput } from '../components/ui/SearchInput';
import { StatusFilter } from '../components/ui/StatusFilter';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { calculateAge } from '../utils/date';
import type { ParticipantStatus, ParticipantWithGuardian } from '../types/database';

export function ParticipantsPage() {
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<ParticipantWithGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | 'all'>('all');

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
    loadParticipants();
  }, []);

  const filteredParticipants = useMemo(() => {
    let result = participants;

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.full_name.toLowerCase().includes(searchLower) ||
          p.guardian?.full_name.toLowerCase().includes(searchLower) ||
          p.congregation?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [participants, statusFilter, search]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Participantes</h1>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">
            {filteredParticipants.length} participante{filteredParticipants.length !== 1 ? 's' : ''} cadastrado{filteredParticipants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/participants/new">
          <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition-all">
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span className="hidden sm:inline">Nova Inscrição</span>
          </button>
        </Link>
      </div>

      {/* Search and Status Filters */}
      <div className="space-y-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Pesquisar por nome, responsável ou congregação..."
        />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
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
        search || statusFilter !== 'all' ? (
          <EmptyState
            title="Nenhum participante encontrado"
            description="Tente alterar os filtros ou termos de pesquisa."
          />
        ) : (
          <EmptyState
            title="Nenhum participante cadastrado"
            description="Comece cadastrando o primeiro participante do retiro."
            icon={<UserPlus className="w-8 h-8 text-slate-400" />}
            action={
              <Link to="/participants/new">
                <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                  Nova Inscrição
                </button>
              </Link>
            }
          />
        )
      ) : (
        <>
          {/* Mobile & Tablet: High contrast spacious Cards */}
          <div className="space-y-3 lg:hidden">
            {filteredParticipants.map((p) => (
              <Card key={p.id} hoverable onClick={() => navigate(`/participants/${p.id}`)} className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 font-extrabold text-slate-800 text-base shadow-2xs">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-900 truncate leading-snug">
                        {p.full_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                        {p.birth_date && (
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {calculateAge(p.birth_date)} anos
                          </span>
                        )}
                        {p.guardian && (
                          <span className="truncate">
                            Resp: <strong className="text-slate-700">{p.guardian.full_name}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <Badge status={p.status} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4">
                    Participante
                  </th>
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4">
                    Idade
                  </th>
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4">
                    Responsável
                  </th>
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4">
                    Congregação
                  </th>
                  <th className="text-xs font-bold text-slate-600 uppercase tracking-wider px-5 py-4 text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.map((p) => (
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
                          {p.email && <p className="text-xs text-slate-500 font-medium">{p.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                      {p.birth_date ? `${calculateAge(p.birth_date)} anos` : '—'}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                      {p.guardian?.full_name ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                      {p.congregation ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Badge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

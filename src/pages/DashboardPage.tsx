import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Home,
  ShieldAlert,
  Shirt,
  Plus,
  ChevronRight,
  Upload,
  TrendingUp,
  MapPin,
  MessageCircle,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchParticipants } from '../services/participants';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCardSkeleton, CardSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../utils/date';
import { canManageData } from '../utils/permissions';
import { computeCoordinatorMetrics } from '../utils/dashboardMetrics';
import { buildWhatsAppUrl } from '../utils/phone';
import type { ParticipantWithGuardian } from '../types/database';

export function DashboardPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const writable = canManageData(profile?.role);

  const [participants, setParticipants] = useState<ParticipantWithGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Coordenador';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchParticipants();
      setParticipants(data);
    } catch {
      setError('Não foi possível carregar os dados do painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const metrics = useMemo(() => computeCoordinatorMetrics(participants), [participants]);
  const recentParticipants = useMemo(() => participants.slice(0, 5), [participants]);
  const maxCongCount = metrics.byCongregation[0]?.count ?? 1;
  const maxDailyCount = Math.max(1, ...metrics.dailyEvolution.map((d) => d.count));

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Retiro 2027 — Coordenação
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-600 mt-1">
            Olá, <span className="font-bold text-slate-900">{displayName}</span>! Acompanhe os inscritos pelo celular.
          </p>
        </div>

        {writable && (
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <Link to="/import" className="w-full sm:w-auto">
              <button
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                           bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm
                           transition-all duration-150 cursor-pointer min-h-[44px]"
              >
                <Upload className="w-4 h-4 stroke-[2.3]" />
                Importar CSV
              </button>
            </Link>
            <Link to="/participants/new" className="w-full sm:w-auto">
              <button
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                           bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm
                           shadow-md shadow-indigo-600/20 transition-all duration-150 cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Nova Inscrição
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="p-4 sm:p-5 flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600 stroke-[2.2]" />
                </div>
                <span className="text-3xl font-black text-slate-900">{metrics.active}</span>
              </div>
              <div className="mt-3">
                <p className="text-xs sm:text-sm font-bold text-slate-700">Inscritos Ativos</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.confirmed} conf. • {metrics.pending} pend.{metrics.cancelled > 0 ? ` • ${metrics.cancelled} canc.` : ''}
                </p>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Home className="w-5 h-5 text-emerald-600 stroke-[2.2]" />
                </div>
                <span className="text-3xl font-black text-slate-900">{metrics.residents}</span>
              </div>
              <div className="mt-3">
                <p className="text-xs sm:text-sm font-bold text-slate-700">Internos (Alojamento)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.nonResidents} não interno(s){metrics.residenceUnknown > 0 ? ` • ${metrics.residenceUnknown} s/ info` : ''}
                </p>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-amber-600 stroke-[2.2]" />
                </div>
                <span className="text-3xl font-black text-slate-900">{metrics.minors}</span>
              </div>
              <div className="mt-3">
                <p className="text-xs sm:text-sm font-bold text-slate-700">Menores (&lt; 18 anos)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.adults} adulto(s) em 06/02/2027
                </p>
              </div>
            </Card>

            <Card
              hoverable
              onClick={() => navigate('/payments')}
              className="p-4 sm:p-5 flex flex-col justify-between min-h-[120px] border-indigo-100"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Shirt className="w-5 h-5 text-indigo-600 stroke-[2.2]" />
                </div>
                <span className="text-3xl font-black text-slate-900">{metrics.shirtsPurchased}</span>
              </div>
              <div className="mt-3">
                <p className="text-xs sm:text-sm font-bold text-slate-700">Camisas Confirmadas</p>
                <p className="text-[11px] text-indigo-600 font-semibold mt-0.5 flex items-center gap-1">
                  {metrics.shirtsNotPurchased} pendente(s) • Abrir lista
                  <ChevronRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </Card>
          </div>

          {/* Minors missing guardian alert */}
          {metrics.minorsWithoutGuardian.length > 0 && (
            <Card
              hoverable
              onClick={() => navigate('/participants?age=missing_guardian')}
              className="p-4 border-rose-200 bg-rose-50/70"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-bold text-rose-900">
                      {metrics.minorsWithoutGuardian.length} menor(es) sem responsável completo
                    </h2>
                    <p className="text-xs text-rose-800 mt-0.5">
                      Toque para conferir os menores de 18 anos que precisam de nome e WhatsApp do responsável.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-rose-600 flex-shrink-0" />
              </div>
            </Card>
          )}

          {/* Congregation breakdown & Daily evolution */}
          {metrics.active > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Inscritos por Congregação
                  </h2>
                  <span className="text-xs text-slate-500">{metrics.byCongregation.length} origem(ns)</span>
                </div>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {metrics.byCongregation.map((item) => (
                    <div key={item.congregation} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 truncate pr-2">
                          {item.congregation}
                        </span>
                        <span className="font-bold text-slate-900">{item.count}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${Math.max(8, Math.round((item.count / maxCongCount) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Evolução Diária de Inscrições
                  </h2>
                  <span className="text-xs text-slate-500">Últimos {metrics.dailyEvolution.length} dia(s)</span>
                </div>
                {metrics.dailyEvolution.length === 0 ? (
                  <p className="text-xs text-slate-500">Sem datas registradas ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {metrics.dailyEvolution.map((day) => (
                      <div key={day.date} className="flex items-center gap-3 text-xs">
                        <span className="w-12 font-mono font-semibold text-slate-600">{day.label}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.max(8, Math.round((day.count / maxDailyCount) * 100))}%` }}
                          />
                        </div>
                        <span className="w-6 text-right font-bold text-slate-800">{day.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {/* Recent Registrations */}
      {!error && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900">Inscrições Recentes</h2>
            {recentParticipants.length > 0 && (
              <Link
                to="/participants"
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
              >
                Ver todos
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : recentParticipants.length === 0 ? (
            <EmptyState
              title="Nenhuma inscrição ainda"
              description={
                writable
                  ? 'Cadastre um participante ou importe o CSV exportado do site da igreja.'
                  : 'Nenhum participante cadastrado no sistema até o momento.'
              }
              action={
                writable ? (
                  <Link to="/import">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm">
                      <Upload className="w-4 h-4" />
                      Importar CSV
                    </button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {recentParticipants.map((participant) => {
                const waUrl = buildWhatsAppUrl(participant.phone);
                return (
                  <Card
                    key={participant.id}
                    hoverable
                    onClick={() => navigate(`/participants/${participant.id}`)}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 font-extrabold text-slate-700 text-base">
                          {participant.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold text-slate-900 truncate leading-snug">
                            {participant.full_name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            {participant.congregation || 'Sem congregação'}
                            {participant.guardian ? ` • Resp: ${participant.guardian.full_name}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            aria-label={`Abrir WhatsApp de ${participant.full_name}`}
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge status={participant.status} />
                          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                            {formatDate(participant.registered_at ?? participant.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Home,
  ShieldAlert,
  Shirt,
  ChevronRight,
  Upload,
  MapPin,
  MessageCircle,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useParticipantsData } from '../contexts/ParticipantsDataContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCardSkeleton, CardSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../utils/date';
import { canManageData } from '../utils/permissions';
import { computeCoordinatorMetrics } from '../utils/dashboardMetrics';
import { buildWhatsAppUrl } from '../utils/phone';

export function DashboardPage() {
  const { profile, user } = useAuth();
  const { participants, loading, error, refresh } = useParticipantsData();
  const writable = canManageData(profile?.role);

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Coordenador';

  const metrics = useMemo(() => computeCoordinatorMetrics(participants), [participants]);
  const recentParticipants = useMemo(() => participants.slice(0, 6), [participants]);
  const maxCongCount = metrics.byCongregation[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* Intro & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Resumo do Retiro
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Olá, {displayName}. Visão geral das inscrições para 6 a 9 de fevereiro de 2027.
          </p>
        </div>

        {writable && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to="/import"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg
                         border border-border bg-white hover:bg-surface-tertiary text-text-primary text-sm font-semibold transition-colors"
            >
              <Upload className="w-4 h-4 text-text-secondary" aria-hidden="true" />
              <span>Importar CSV</span>
            </Link>
            <Link
              to="/participants/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg
                         bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>Nova inscrição</span>
            </Link>
          </div>
        )}
      </div>

      {/* Main Stats Strip */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void refresh(true)} />
      ) : (
        <>
          <section aria-label="Indicadores principais" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-xs font-medium">Inscritos ativos</span>
                <Users className="w-4 h-4 text-primary-600" aria-hidden="true" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-text-primary tabular-nums mt-2">
                {metrics.active}
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                {metrics.confirmed} confirmados · {metrics.pending} pendentes
                {metrics.cancelled > 0 ? ` · ${metrics.cancelled} cancelados` : ''}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-xs font-medium">Ficarão internos</span>
                <Home className="w-4 h-4 text-success" aria-hidden="true" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-text-primary tabular-nums mt-2">
                {metrics.residents}
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                {metrics.nonResidents} externos
                {metrics.residenceUnknown > 0 ? ` · ${metrics.residenceUnknown} sem resposta` : ''}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="text-xs font-medium">Menores de 18 anos</span>
                <UserCheck className="w-4 h-4 text-warning" aria-hidden="true" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-text-primary tabular-nums mt-2">
                {metrics.minors}
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                {metrics.adults} adultos (data-base 06/02/2027)
              </p>
            </Card>

            <Link
              to="/payments"
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <Card className="p-4 h-full hover:border-primary-300 transition-colors">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-xs font-medium">Camisas confirmadas</span>
                  <Shirt className="w-4 h-4 text-primary-600" aria-hidden="true" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-text-primary tabular-nums mt-2">
                  {metrics.shirtsPurchased}
                </p>
                <p className="text-xs font-medium text-primary-600 mt-1 inline-flex items-center gap-1">
                  <span>{metrics.shirtsNotPurchased} pendentes · Abrir lista</span>
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </p>
              </Card>
            </Link>
          </section>

          {/* Minors missing guardian alert */}
          {metrics.minorsWithoutGuardian.length > 0 && (
            <Link
              to="/participants?age=missing_guardian"
              className="flex items-center justify-between gap-3 p-4 rounded-xl bg-danger-light border border-danger/25 hover:border-danger/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {metrics.minorsWithoutGuardian.length} menor(es) sem dados completos do responsável
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Toque para visualizar os menores de 18 anos que precisam de nome e WhatsApp do responsável.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-danger flex-shrink-0" aria-hidden="true" />
            </Link>
          )}

          {/* Congregation Breakdown & Recent Registrations */}
          {metrics.active === 0 ? (
            <EmptyState
              title="Nenhuma inscrição cadastrada"
              description={
                writable
                  ? 'Importe o arquivo CSV exportado do site da igreja ou cadastre o primeiro participante.'
                  : 'Nenhum participante cadastrado no momento.'
              }
              action={
                writable ? (
                  <Link
                    to="/import"
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary-600 text-white font-semibold text-sm"
                  >
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    Importar CSV da igreja
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left 5 cols: Congregations */}
              <Card className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-600" aria-hidden="true" />
                    Inscritos por congregação
                  </h2>
                  <span className="text-xs text-text-tertiary tabular-nums">
                    {metrics.byCongregation.length} origem(ns)
                  </span>
                </div>

                <div className="divide-y divide-border/70 max-h-80 overflow-y-auto">
                  {metrics.byCongregation.map((item) => (
                    <Link
                      key={item.congregation}
                      to={`/participants?congregation=${encodeURIComponent(item.congregation)}`}
                      className="block py-2.5 first:pt-1 last:pb-1 hover:bg-surface-secondary/80 rounded-lg px-1.5 -mx-1.5 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-text-primary truncate pr-2">
                          {item.congregation}
                        </span>
                        <span className="font-bold text-text-primary tabular-nums">{item.count}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
                        <div
                          className="h-full bg-primary-600 rounded-full"
                          style={{
                            width: `${Math.max(6, Math.round((item.count / maxCongCount) * 100))}%`,
                          }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>

              {/* Right 7 cols: Recent Registrations */}
              <Card className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-text-primary">Últimas inscrições</h2>
                  <Link
                    to="/participants"
                    className="text-xs font-semibold text-primary-600 hover:underline inline-flex items-center gap-1 py-1"
                  >
                    Ver lista completa
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>

                <div className="divide-y divide-border">
                  {recentParticipants.map((participant) => {
                    const waUrl = buildWhatsAppUrl(participant.phone);
                    return (
                      <div
                        key={participant.id}
                        className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                      >
                        <Link
                          to={`/participants/${participant.id}`}
                          className="flex items-center gap-3 min-w-0 flex-1 group"
                        >
                          <div className="w-9 h-9 rounded-full bg-surface-tertiary border border-border flex items-center justify-center flex-shrink-0 font-semibold text-text-primary text-sm">
                            {participant.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text-primary group-hover:text-primary-600 truncate">
                              {participant.full_name}
                            </p>
                            <p className="text-xs text-text-tertiary truncate">
                              {participant.congregation || 'Congregação não informada'}
                              {participant.guardian ? ` · Responsável: ${participant.guardian.full_name}` : ''}
                            </p>
                          </div>
                        </Link>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Abrir WhatsApp de ${participant.full_name}`}
                              title="Conversar no WhatsApp"
                              className="w-10 h-10 rounded-lg bg-success-light text-success hover:bg-emerald-100 border border-emerald-200 inline-flex items-center justify-center transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" aria-hidden="true" />
                            </a>
                          )}
                          <div className="hidden sm:flex flex-col items-end gap-1">
                            <Badge status={participant.status} />
                            <span className="text-[11px] text-text-tertiary tabular-nums">
                              {formatDate(participant.registered_at ?? participant.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

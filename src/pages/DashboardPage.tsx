import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, UserCheck, Clock, Shield, Plus, ChevronRight, Wallet, Shirt } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchDashboardStats, fetchRecentParticipants } from '../services/participants';
import {
  calculatePaymentSummary,
  fetchPaymentsWithParticipants,
  isPaymentsTableMissingError,
} from '../services/payments';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCardSkeleton, CardSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../utils/date';
import { formatCurrency } from '../utils/payment';
import type { DashboardStats, ParticipantWithGuardian, PaymentSummary } from '../types/database';

export function DashboardPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentParticipants, setRecentParticipants] = useState<ParticipantWithGuardian[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Coordenador';

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsData, recentData] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentParticipants(5),
      ]);
      setStats(statsData);
      setRecentParticipants(recentData);

      try {
        const payData = await fetchPaymentsWithParticipants();
        setPaymentSummary(calculatePaymentSummary(payData.payments));
      } catch (payErr) {
        if (!isPaymentsTableMissingError(payErr)) {
          setPaymentSummary(null);
        }
      }
    } catch {
      setError('Não foi possível carregar os dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statCards = stats
    ? [
        {
          label: 'Total de Participantes',
          value: stats.total_participants,
          icon: Users,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50 border-indigo-100',
        },
        {
          label: 'Confirmados',
          value: stats.confirmed,
          icon: UserCheck,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 border-emerald-100',
        },
        {
          label: 'Pendentes',
          value: stats.pending,
          icon: Clock,
          color: 'text-amber-600',
          bg: 'bg-amber-50 border-amber-100',
        },
        {
          label: 'Responsáveis',
          value: stats.total_guardians,
          icon: Shield,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50 border-indigo-100',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Retiro 2027
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-600 mt-1">
            Olá, <span className="font-bold text-slate-900">{displayName}</span>! 👋 Bem-vindo ao painel.
          </p>
        </div>
        <Link to="/participants/new" className="w-full sm:w-auto">
          <button
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl
                       bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-base
                       shadow-md shadow-indigo-600/20 transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            Nova Inscrição
          </button>
        </Link>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {statCards.map((stat) => (
            <Card key={stat.label} className="flex flex-col justify-between min-h-[110px] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} border flex items-center justify-center shadow-2xs`}>
                  <stat.icon className={`w-5 h-5 ${stat.color} stroke-[2.2]`} />
                </div>
                <span className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-3 leading-snug">{stat.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Payments & Shirts Quick Summary */}
      {!loading && !error && (
        <Card
          hoverable
          onClick={() => navigate('/payments')}
          className="p-4 sm:p-5 border-indigo-100 bg-gradient-to-r from-white to-indigo-50/40"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  Controle de Pagamentos & Blusas
                </h2>
                {paymentSummary ? (
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Arrecadado:{' '}
                    <strong className="text-emerald-700">
                      {formatCurrency(paymentSummary.total_collected)}
                    </strong>{' '}
                    • {paymentSummary.paid_count} pago{paymentSummary.paid_count !== 1 ? 's' : ''} •{' '}
                    {paymentSummary.unpaid_count + paymentSummary.partial_count} pendente
                    {paymentSummary.unpaid_count + paymentSummary.partial_count !== 1 ? 's' : ''}
                    {paymentSummary.shirt_count > 0 && (
                      <span className="inline-flex items-center gap-1 ml-2 text-indigo-700 font-semibold">
                        <Shirt className="w-3.5 h-3.5" />
                        {paymentSummary.shirt_count} blusa{paymentSummary.shirt_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Gerencie quem pagou e organize a lista de blusas do retiro.
                  </p>
                )}
              </div>
            </div>

            <span className="text-sm font-bold text-indigo-600 flex items-center gap-1 self-end sm:self-center">
              Abrir lista
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </span>
          </div>
        </Card>
      )}

      {/* Recent Registrations */}
      {!error && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900">
              Inscrições Recentes
            </h2>
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
              description="Comece cadastrando o primeiro participante do retiro."
              action={
                <Link to="/participants/new">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm">
                    <Plus className="w-4 h-4" />
                    Nova Inscrição
                  </button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {recentParticipants.map((participant) => (
                <Card
                  key={participant.id}
                  hoverable
                  onClick={() => navigate(`/participants/${participant.id}`)}
                  className="p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Avatar & Name details */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 font-extrabold text-slate-700 text-base shadow-2xs">
                        {participant.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-slate-900 truncate leading-snug">
                          {participant.full_name}
                        </p>
                        {participant.guardian ? (
                          <p className="text-xs sm:text-sm text-slate-500 font-medium truncate mt-0.5">
                            Resp: <span className="text-slate-700 font-semibold">{participant.guardian.full_name}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">Sem responsável</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Badge & Date */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge status={participant.status} />
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                        {formatDate(participant.created_at)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { RefreshCw, UserPlus, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useParticipantsData } from '../../contexts/ParticipantsDataContext';
import { usePwaInstall } from '../pwa/PwaStatusBar';
import { canManageData } from '../../utils/permissions';

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Painel';
  if (pathname === '/participants/new') return 'Nova inscrição';
  if (pathname.endsWith('/edit')) return 'Editar inscrito';
  if (pathname.startsWith('/participants/')) return 'Ficha do inscrito';
  if (pathname.startsWith('/participants')) return 'Inscritos';
  if (pathname.startsWith('/payments')) return 'Camisas';
  if (pathname.startsWith('/import')) return 'Importar CSV';
  if (pathname.startsWith('/reports')) return 'Relatórios';
  if (pathname.startsWith('/users')) return 'Equipe e contas';
  if (pathname.startsWith('/profile')) return 'Perfil e auditoria';
  return 'Retiro 2027';
}

export function TopHeader() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const { refreshing, lastUpdated, refresh } = useParticipantsData();
  const { canInstall, triggerInstall } = usePwaInstall();

  const writable = canManageData(profile?.role);
  const pageTitle = getPageTitle(pathname);
  const showQuickAdd = writable && (pathname === '/dashboard' || pathname === '/participants');

  const updatedLabel = lastUpdated
    ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 max-w-6xl mx-auto gap-3">
        {/* Mobile Brand + Page Title / Desktop Page Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to="/dashboard"
            className="lg:hidden w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-primary-900"
            aria-label="Ir para o painel inicial"
          >
            <img
              src="/logo-128.webp"
              alt=""
              width={32}
              height={32}
              decoding="async"
              className="w-full h-full object-cover"
            />
          </Link>
          <div className="min-w-0">
            <p className="text-base sm:text-lg font-bold text-text-primary leading-tight truncate">
              {pageTitle}
            </p>
            {updatedLabel && (
              <p className="hidden sm:block text-xs text-text-tertiary leading-tight">
                {updatedLabel}
              </p>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canInstall && (
            <button
              type="button"
              onClick={() => void triggerInstall()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Instalar aplicativo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void refresh(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] min-w-[40px] rounded-lg border border-border bg-white hover:bg-surface-tertiary text-text-secondary text-xs font-medium cursor-pointer transition-colors disabled:opacity-60"
            aria-label="Atualizar lista de inscritos"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary-600' : ''}`} aria-hidden="true" />
            <span className="hidden sm:inline">{refreshing ? 'Atualizando…' : 'Atualizar'}</span>
          </button>

          {showQuickAdd && (
            <Link
              to="/participants/new"
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>Novo</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

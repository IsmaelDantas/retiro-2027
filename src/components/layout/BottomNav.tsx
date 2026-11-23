import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Shirt,
  Upload,
  FileBarChart,
  MoreHorizontal,
  UserPlus,
  UserCog,
  User,
  LogOut,
  Download,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { canManageData, canManageUsers, getRoleLabel } from '../../utils/permissions';
import { Modal } from '../ui/Modal';
import { usePwaInstall } from '../pwa/PwaStatusBar';

/** Barra inferior mobile 4+1 (máximo 5 itens bem espaçados e com safe-area) */
export function BottomNav() {
  const { profile, user, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { canInstall, triggerInstall } = usePwaInstall();

  const [moreOpen, setMoreOpen] = useState(false);
  const writable = canManageData(profile?.role);
  const manageUsers = canManageUsers(profile?.role);

  const primaryTabs = [
    { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
    { to: '/participants', label: 'Inscritos', icon: Users },
    { to: '/payments', label: 'Camisas', icon: Shirt },
    writable
      ? { to: '/import', label: 'Importar', icon: Upload }
      : { to: '/reports', label: 'Relatórios', icon: FileBarChart },
  ];

  const isMoreActive =
    pathname.startsWith('/reports') ||
    pathname.startsWith('/users') ||
    pathname.startsWith('/profile') ||
    pathname === '/participants/new';

  const handleNavigate = (to: string) => {
    setMoreOpen(false);
    navigate(to);
  };

  return (
    <>
      <nav
        aria-label="Navegação inferior"
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border z-40 shadow-[0_-2px_10px_rgba(15,23,42,0.06)]"
        style={{
          paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="grid grid-cols-5 items-center max-w-lg mx-auto h-14">
          {primaryTabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 min-h-[44px] rounded-lg
                transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                ${isActive ? 'text-primary-600 font-semibold' : 'text-text-secondary hover:text-text-primary font-medium'}
              `}
            >
              <item.icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[11px] leading-tight truncate max-w-full">{item.label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className={`
              flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 min-h-[44px] rounded-lg cursor-pointer
              transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
              ${isMoreActive ? 'text-primary-600 font-semibold' : 'text-text-secondary hover:text-text-primary font-medium'}
            `}
          >
            <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] leading-tight">Mais</span>
          </button>
        </div>
      </nav>

      {/* Menu secundário organizado no celular */}
      <Modal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Menu do coordenador">
        <div className="space-y-2">
          <div className="px-3 py-2.5 rounded-xl bg-surface-tertiary/80 border border-border mb-3">
            <p className="text-sm font-semibold text-text-primary truncate">
              {profile?.name || user?.email || 'Usuário'}
            </p>
            <p className="text-xs text-text-secondary">{getRoleLabel(profile?.role)}</p>
          </div>

          {writable && (
            <button
              type="button"
              onClick={() => handleNavigate('/participants/new')}
              className="flex items-center gap-3 w-full px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 cursor-pointer"
            >
              <UserPlus className="w-5 h-5" aria-hidden="true" />
              <span>Nova inscrição manual</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleNavigate('/reports')}
            className="flex items-center gap-3 w-full px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium text-text-primary hover:bg-surface-tertiary cursor-pointer"
          >
            <FileBarChart className="w-5 h-5 text-text-secondary" aria-hidden="true" />
            <span>Relatórios e exportação CSV</span>
          </button>

          {manageUsers && (
            <button
              type="button"
              onClick={() => handleNavigate('/users')}
              className="flex items-center gap-3 w-full px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium text-text-primary hover:bg-surface-tertiary cursor-pointer"
            >
              <UserCog className="w-5 h-5 text-text-secondary" aria-hidden="true" />
              <span>Equipe e Contas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleNavigate('/profile')}
            className="flex items-center gap-3 w-full px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium text-text-primary hover:bg-surface-tertiary cursor-pointer"
          >
            <User className="w-5 h-5 text-text-secondary" aria-hidden="true" />
            <span>Perfil e log de auditoria</span>
          </button>

          {canInstall && (
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                void triggerInstall();
              }}
              className="flex items-center gap-3 w-full px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium text-primary-700 hover:bg-primary-50 cursor-pointer"
            >
              <Download className="w-5 h-5" aria-hidden="true" />
              <span>Instalar aplicativo no celular</span>
            </button>
          )}

          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                void signOut();
              }}
              className="flex items-center gap-3 w-full px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium text-danger hover:bg-danger-light cursor-pointer"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

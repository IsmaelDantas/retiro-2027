import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wallet,
  FileBarChart,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/participants', label: 'Participantes', icon: Users },
  { to: '/participants/new', label: 'Nova Inscrição', icon: UserPlus },
  { to: '/payments', label: 'Pagamentos & Blusas', icon: Wallet },
  { to: '/reports', label: 'Relatórios', icon: FileBarChart },
  { to: '/profile', label: 'Perfil', icon: User },
];

export function Sidebar() {
  const { signOut, profile, user } = useAuth();
  const { isDrawerOpen, closeDrawer } = useSidebar();

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Coordenador';

  if (!isDrawerOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-200"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col
                   animate-in slide-in-from-left duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shadow-sm">
              <img src="/logo.jpg" alt="Retiro 2027" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary leading-tight">Retiro 2027</h2>
              <p className="text-xs text-text-tertiary">Gestão de Participantes</p>
            </div>
          </div>

          <button
            onClick={closeDrawer}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-tertiary
                       transition-colors duration-150 cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeDrawer}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium
                transition-all duration-150
                ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User profile footer */}
        <div className="border-t border-border p-4 bg-surface-secondary/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary-700">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
              <p className="text-xs text-text-tertiary truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              closeDrawer();
              signOut();
            }}
            className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-lg text-sm text-text-secondary
                       hover:bg-danger-light hover:text-danger transition-all duration-150 cursor-pointer font-medium"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sair da conta
          </button>
        </div>
      </aside>
    </>
  );
}

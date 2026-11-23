import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Shirt,
  FileBarChart,
  Upload,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { canManageData, getRoleLabel } from '../../utils/permissions';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard, requiresWrite: false },
  { to: '/participants', label: 'Inscritos', icon: Users, requiresWrite: false },
  { to: '/payments', label: 'Camisas', icon: Shirt, requiresWrite: false },
  { to: '/import', label: 'Importar CSV', icon: Upload, requiresWrite: true },
  { to: '/reports', label: 'Relatórios', icon: FileBarChart, requiresWrite: false },
];

/** Navegação lateral fixa em desktop (lg+); oculta no celular onde opera a barra inferior 4+1 */
export function Sidebar() {
  const { signOut, profile, user } = useAuth();
  const displayName = profile?.name || user?.email?.split('@')[0] || 'Coordenador';
  const writable = canManageData(profile?.role);
  const visibleItems = NAV_ITEMS.filter((item) => !item.requiresWrite || writable);

  return (
    <aside
      aria-label="Navegação principal"
      className="hidden lg:flex lg:w-64 lg:flex-col lg:flex-shrink-0 bg-surface-tertiary/80 border-r border-border min-h-dvh sticky top-0 max-h-dvh"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border bg-white/70">
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-primary-900 border border-primary-800/20">
          <img
            src="/logo-128.webp"
            alt="Retiro 2027"
            width={36}
            height={36}
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary leading-tight truncate">Retiro 2027</p>
          <p className="text-xs text-text-secondary leading-tight truncate">ADTC Ubajara</p>
        </div>
      </div>

      {/* Primary Action */}
      {writable && (
        <div className="px-4 pt-4">
          <Link
            to="/participants/new"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 min-h-[44px] rounded-lg
                       bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold
                       transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <UserPlus className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>Nova inscrição</span>
          </Link>
        </div>
      )}

      {/* Navigation items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium
              transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
              ${
                isActive
                  ? 'bg-white text-primary-600 font-semibold border border-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                  : 'text-text-secondary hover:bg-white/70 hover:text-text-primary'
              }
            `}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Account Footer */}
      <div className="border-t border-border p-3 bg-white/60 space-y-1.5">
        <NavLink
          to="/profile"
          className={({ isActive }) => `
            flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-lg transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
            ${isActive ? 'bg-white border border-border text-primary-600' : 'hover:bg-white text-text-primary'}
          `}
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 font-bold text-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">{displayName}</p>
            <p className="text-[11px] text-text-tertiary truncate">{getRoleLabel(profile?.role)}</p>
          </div>
          <User className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden="true" />
        </NavLink>

        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2.5 w-full px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium text-text-secondary
                     hover:bg-danger-light hover:text-danger transition-colors duration-150 cursor-pointer
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
}

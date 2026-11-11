import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';

export function TopHeader() {
  const { signOut, profile, user } = useAuth();
  const { isDrawerOpen, toggleDrawer } = useSidebar();

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Coordenador';

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between h-16 px-4 max-w-5xl mx-auto">
        {/* Left: Brand logo & name */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDrawer}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100
                       transition-colors duration-150 cursor-pointer focus:outline-none"
            title={isDrawerOpen ? 'Fechar menu' : 'Menu principal'}
            aria-label="Abrir menu"
          >
            {isDrawerOpen ? (
              <X className="w-6 h-6 text-slate-800" />
            ) : (
              <Menu className="w-6 h-6 text-slate-800" />
            )}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-slate-900">
              <img src="/logo.jpg" alt="Retiro 2027" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 leading-tight block">
                Retiro 2027
              </span>
              <span className="text-xs text-slate-500 leading-none block mt-0.5">
                Gestão de Participantes
              </span>
            </div>
          </div>
        </div>

        {/* Right: User profile & Logout */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2.5 bg-slate-100/80 px-3 py-1.5 rounded-full">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-slate-800 max-w-[120px] truncate">
              {displayName}
            </span>
          </div>

          <button
            onClick={signOut}
            className="p-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50
                       transition-colors duration-150 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Sair da conta"
          >
            <LogOut className="w-5 h-5 text-slate-600 hover:text-rose-600" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}

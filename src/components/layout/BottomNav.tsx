import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileBarChart,
  User,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/participants', label: 'Lista', icon: Users },
  { to: '/participants/new', label: 'Inscrição', icon: UserPlus },
  { to: '/reports', label: 'Relatórios', icon: FileBarChart },
  { to: '/profile', label: 'Perfil', icon: User },
];

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-40 shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex flex-col items-center justify-center gap-1 px-3 py-1.5 min-w-[60px]
              rounded-xl transition-all duration-150 active:scale-95
              ${
                isActive
                  ? 'text-indigo-600 font-bold bg-indigo-50/80 shadow-2xs'
                  : 'text-slate-500 font-medium hover:text-slate-900'
              }
            `}
          >
            <item.icon className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[11px] leading-none tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

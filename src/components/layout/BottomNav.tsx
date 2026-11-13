import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wallet,
  FileBarChart,
  User,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/participants', label: 'Lista', icon: Users },
  { to: '/participants/new', label: 'Inscrição', icon: UserPlus },
  { to: '/payments', label: 'Blusas', icon: Wallet },
  { to: '/reports', label: 'Relat.', icon: FileBarChart },
  { to: '/profile', label: 'Perfil', icon: User },
];

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-40 shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex flex-col items-center justify-center gap-1 px-1.5 py-1.5 flex-1 min-w-0
              rounded-xl transition-all duration-150 active:scale-95
              ${
                isActive
                  ? 'text-indigo-600 font-bold bg-indigo-50/80 shadow-2xs'
                  : 'text-slate-500 font-medium hover:text-slate-900'
              }
            `}
          >
            <item.icon className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] leading-none tracking-tight truncate max-w-full">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

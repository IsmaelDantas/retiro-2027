import { Outlet } from 'react-router-dom';
import { TopHeader } from './TopHeader';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col font-sans antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-indigo-600 focus:text-white focus:font-bold focus:text-sm"
      >
        Pular para o conteúdo principal
      </a>

      {/* Top Header Bar */}
      <TopHeader />

      {/* Slide-over Menu Drawer */}
      <Sidebar />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 pb-24 lg:pb-10">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

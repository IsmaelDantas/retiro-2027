import { Outlet } from 'react-router-dom';
import { TopHeader } from './TopHeader';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { PwaStatusBar } from '../pwa/PwaStatusBar';

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-surface-secondary flex flex-col lg:flex-row font-sans antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary-600 focus:text-white focus:font-semibold focus:text-sm"
      >
        Pular para o conteúdo principal
      </a>

      {/* Fixed left navigation rail on desktop (lg+) */}
      <Sidebar />

      {/* Main workspace column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopHeader />

        <main
          id="main-content"
          className="flex-1 pb-24 lg:pb-10"
        >
          <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
            <PwaStatusBar />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom 4+1 navigation on mobile (< lg) */}
      <BottomNav />
    </div>
  );
}

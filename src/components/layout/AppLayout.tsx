import { Outlet } from 'react-router-dom';
import { TopHeader } from './TopHeader';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col font-sans antialiased">
      {/* Top Header Bar */}
      <TopHeader />

      {/* Slide-over Menu Drawer */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 pb-24 lg:pb-10">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

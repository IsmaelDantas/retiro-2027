import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ParticipantsDataProvider } from './contexts/ParticipantsDataContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ToastContainer } from './components/ui/Toast';
import { DetailSkeleton } from './components/ui/Skeleton';
import { LoginPage } from './pages/LoginPage';

// Route-level code splitting for authenticated app views & shell
const AppLayout = lazy(() =>
  import('./components/layout/AppLayout').then((m) => ({ default: m.AppLayout }))
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const ParticipantsPage = lazy(() =>
  import('./pages/ParticipantsPage').then((m) => ({ default: m.ParticipantsPage }))
);
const ParticipantDetailPage = lazy(() =>
  import('./pages/ParticipantDetailPage').then((m) => ({ default: m.ParticipantDetailPage }))
);
const ParticipantFormPage = lazy(() =>
  import('./pages/ParticipantFormPage').then((m) => ({ default: m.ParticipantFormPage }))
);
const PaymentsPage = lazy(() =>
  import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage }))
);
const ImportPage = lazy(() => import('./pages/ImportPage').then((m) => ({ default: m.ImportPage })));
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);

function RouteFallback() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <DetailSkeleton />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ParticipantsDataProvider>
          <ToastProvider>
            <ToastContainer />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/participants" element={<ParticipantsPage />} />
                  <Route path="/participants/new" element={<ParticipantFormPage />} />
                  <Route path="/participants/:id" element={<ParticipantDetailPage />} />
                  <Route path="/participants/:id/edit" element={<ParticipantFormPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/import" element={<ImportPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </ParticipantsDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

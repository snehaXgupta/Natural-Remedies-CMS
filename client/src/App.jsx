import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { NAV } from './auth/navigation.js';
import { AppShell } from './layout/AppShell.jsx';
import { Loading } from './components/States.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx';
import { ChangePasswordPage } from './pages/ChangePasswordPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

// Route-level code splitting for heavy secondary pages
const PlannedPage = lazy(() => import('./pages/PlannedPage.jsx').then((m) => ({ default: m.PlannedPage })));
const UsersRolesPage = lazy(() => import('./pages/admin/UsersRolesPage.jsx').then((m) => ({ default: m.UsersRolesPage })));
const ComplaintsPage = lazy(() => import('./pages/complaints/ComplaintsPage.jsx').then((m) => ({ default: m.ComplaintsPage })));
const NewComplaintPage = lazy(() => import('./pages/complaints/NewComplaintPage.jsx').then((m) => ({ default: m.NewComplaintPage })));
const ComplaintDetailPage = lazy(() => import('./pages/complaints/ComplaintDetailPage.jsx').then((m) => ({ default: m.ComplaintDetailPage })));
const NotificationLogsPage = lazy(() => import('./pages/notifications/NotificationLogsPage.jsx').then((m) => ({ default: m.NotificationLogsPage })));
const PendingReviewsPage = lazy(() => import('./pages/reviews/PendingReviewsPage.jsx').then((m) => ({ default: m.PendingReviewsPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage.jsx').then((m) => ({ default: m.SettingsPage })));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage.jsx').then((m) => ({ default: m.ReportsPage })));
const DashboardsPage = lazy(() => import('./pages/dashboards/DashboardsPage.jsx').then((m) => ({ default: m.DashboardsPage })));
const SimulatorPage = lazy(() => import('./pages/whatsapp/SimulatorPage.jsx').then((m) => ({ default: m.SimulatorPage })));
const EmailDetailPage = lazy(() => import('./pages/complaints/EmailDetailPage.jsx').then((m) => ({ default: m.EmailDetailPage })));

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loading label="Loading..." />
    </div>
  );
}

/** Render children only if the user has one of the permissions. */
function Guard({ any, children }) {
  const { canAny } = useAuth();
  if (any.length && !canAny(...any)) return <NotFoundPage forbidden />;
  return children;
}

const navFor = (to) => NAV.find((n) => n.to === to);

export default function App() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading label="Checking your session" />
      </div>
    );
  }

  if (status === 'signedOut') {
    return (
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  if (user.mustChangePassword) return <ChangePasswordPage forced />;

  const planned = NAV.filter((n) => n.phase);

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="admin/users"
            element={
              <Guard any={navFor('/admin/users').any}>
                <UsersRolesPage />
              </Guard>
            }
          />
          <Route path="complaints" element={<Guard any={['complaint.view.all', 'complaint.view.assigned']}><ComplaintsPage key="all" /></Guard>} />
          <Route path="complaints/new" element={<Guard any={['complaint.create.manual']}><NewComplaintPage /></Guard>} />
          <Route path="complaints/:id" element={<Guard any={['complaint.view.all', 'complaint.view.assigned']}><ComplaintDetailPage /></Guard>} />
          <Route path="complaints/:complaintId/emails/:emailId" element={<Guard any={['complaint.view.all', 'complaint.view.assigned']}><EmailDetailPage /></Guard>} />
          <Route path="emails/:emailId" element={<Guard any={['complaint.view.all', 'complaint.view.assigned', 'notifications.view']}><EmailDetailPage /></Guard>} />
          <Route path="my-complaints" element={<Guard any={navFor('/my-complaints').any}><ComplaintsPage key="mine" mine /></Guard>} />
          <Route path="reviews" element={<Guard any={navFor('/reviews').any}><PendingReviewsPage /></Guard>} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="dashboards" element={<DashboardsPage />} />
          <Route path="whatsapp-simulator" element={<Guard any={navFor('/whatsapp-simulator').any}><SimulatorPage /></Guard>} />
          <Route path="settings" element={<Guard any={['settings.manage']}><SettingsPage /></Guard>} />
          <Route path="notifications" element={<Guard any={navFor('/notifications').any}><NotificationLogsPage /></Guard>} />
          {planned.map((n) => (
            <Route
              key={n.to}
              path={n.to.slice(1)}
              element={
                <Guard any={n.any}>
                  <PlannedPage title={n.label} phase={n.phase} />
                </Guard>
              }
            />
          ))}
          <Route path="account/password" element={<ChangePasswordPage />} />
          <Route path="forgot-password" element={<Navigate to="/" replace />} />
          <Route path="reset-password" element={<Navigate to="/" replace />} />
          <Route path="login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

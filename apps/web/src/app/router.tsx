import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminPage } from '@/features/admin/AdminPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { LandingPage } from '@/features/auth/LandingPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { HabitDetailPage } from '@/features/dashboard/HabitDetailPage';
import { ShareSnapshotPage } from '@/features/dashboard/ShareSnapshotPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 text-text">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
        <h1 className="text-2xl font-bold">Page not found</h1>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/share/:snapshotId', element: <ShareSnapshotPage /> },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'calendar', element: <CalendarPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'onboarding', element: <OnboardingPage /> },
          { path: 'habits/:habitId', element: <HabitDetailPage /> },
          { path: 'admin', element: <AdminPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

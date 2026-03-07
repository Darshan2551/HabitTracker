import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';

export function ProtectedRoute() {
  const { user, accessToken, isHydrated } = useAuthStore();
  const location = useLocation();

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-text">
        <p className="text-sm text-muted">Loading session...</p>
      </div>
    );
  }

  if (!user || !accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

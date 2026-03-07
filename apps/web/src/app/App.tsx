import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { authApi, type AuthMeResponse } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore } from '@/store/theme-store';
import { router } from './router';

export function App() {
  const applyTheme = useThemeStore((state) => state.applyTheme);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  useEffect(() => {
    if (!accessToken || user) return;
    void authApi
      .me()
      .then((payload) => {
        const profile = payload as AuthMeResponse;
        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          emailVerified: profile.emailVerified,
          timezone: profile.timezone,
          locale: profile.locale,
        });
      })
      .catch(() => clearSession());
  }, [accessToken, clearSession, setUser, user]);

  useOfflineSync();

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </>
  );
}

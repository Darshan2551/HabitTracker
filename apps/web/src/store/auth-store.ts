import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  timezone?: string;
  locale?: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  csrfToken: string | null;
  isHydrated: boolean;
  setSession: (payload: { user: AuthUser; accessToken: string; csrfToken: string }) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
  setHydrated: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      csrfToken: null,
      isHydrated: false,
      setSession: ({ user, accessToken, csrfToken }) =>
        set({
          user,
          accessToken,
          csrfToken,
        }),
      setUser: (user) => set({ user }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          csrfToken: null,
        }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'habittracker-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        csrfToken: state.csrfToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

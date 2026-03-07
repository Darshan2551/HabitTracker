import axios, { type AxiosRequestConfig } from 'axios';
import { useAuthStore, type AuthUser } from '@/store/auth-store';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15_000,
});

async function refreshSession(): Promise<string | null> {
  const { csrfToken, clearSession, setSession, user } = useAuthStore.getState();
  if (!csrfToken) return null;

  try {
    const response = await api.post('/auth/refresh', {}, { headers: { 'x-csrf-token': csrfToken } });
    const body = response.data as {
      user: AuthUser;
      accessToken: string;
      csrfToken: string;
    };
    setSession({
      user: body.user ?? (user as AuthUser),
      accessToken: body.accessToken,
      csrfToken: body.csrfToken,
    });
    return body.accessToken;
  } catch {
    clearSession();
    return null;
  }
}

export async function requestWithAuth<T>(config: AxiosRequestConfig): Promise<T> {
  const state = useAuthStore.getState();
  try {
    const response = await api.request<T>({
      ...config,
      headers: {
        ...(config.headers ?? {}),
        Authorization: state.accessToken ? `Bearer ${state.accessToken}` : undefined,
      },
    });
    return response.data;
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      throw error;
    }
    const refreshed = await refreshSession();
    if (!refreshed) {
      throw error;
    }
    const retry = await api.request<T>({
      ...config,
      headers: {
        ...(config.headers ?? {}),
        Authorization: `Bearer ${refreshed}`,
      },
    });
    return retry.data;
  }
}

export type HabitSchedule =
  | { type: 'daily'; interval: number; time?: string }
  | { type: 'weekly'; days: number[]; intervalWeeks?: number; time?: string }
  | { type: 'monthly'; days: number[]; intervalMonths?: number; time?: string }
  | { type: 'custom'; rule: 'every_n_days' | 'weekdays' | 'weekends'; interval?: number; time?: string };

export type Habit = {
  id: string;
  title: string;
  description?: string;
  color?: string;
  schedule: HabitSchedule;
  goal?: Record<string, unknown>;
  graceDays: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  tags?: Array<{ tag: { id: string; name: string } }>;
  completions?: Array<{ id: string; completedAt: string; note?: string }>;
  stats?: {
    currentStreak: number;
    bestStreak: number;
    completionRate: number;
  };
};

export type AuthMeResponse = AuthUser & {
  timezone?: string;
  locale?: string;
  settings?: Record<string, unknown>;
};

export const authApi = {
  register: (payload: { email: string; password: string; name?: string }) =>
    api.post('/auth/register', payload).then((response) => response.data),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }).then((r) => r.data),
  login: (payload: { email: string; password: string }) =>
    api.post('/auth/login', payload).then((response) => response.data),
  loginWithGoogle: (idToken: string) =>
    api.post('/auth/oauth/google', { idToken }).then((response) => response.data),
  me: () => requestWithAuth<AuthMeResponse>({ method: 'GET', url: '/auth/me' }),
  logout: () => {
    const csrfToken = useAuthStore.getState().csrfToken;
    return api
      .post(
        '/auth/logout',
        {},
        {
          headers: {
            'x-csrf-token': csrfToken ?? '',
          },
        },
      )
      .then((response) => response.data);
  },
  requestReset: (email: string) => api.post('/auth/reset', { email }).then((r) => r.data),
  confirmReset: (token: string, newPassword: string) =>
    api.post('/auth/reset/confirm', { token, newPassword }).then((r) => r.data),
  deleteAccount: () => {
    const csrfToken = useAuthStore.getState().csrfToken;
    return requestWithAuth({
      method: 'DELETE',
      url: '/auth/account',
      headers: { 'x-csrf-token': csrfToken ?? '' },
    });
  },
};

export const habitsApi = {
  list: (params?: { filter?: 'all' | 'today' | 'week' | 'overdue'; tag?: string }) =>
    requestWithAuth<{ habits: Habit[] }>({ method: 'GET', url: '/habits', params }),
  create: (payload: Record<string, unknown>) =>
    requestWithAuth<{ habit: Habit }>({ method: 'POST', url: '/habits', data: payload }),
  get: (id: string) => requestWithAuth<{ habit: Habit }>({ method: 'GET', url: `/habits/${id}` }),
  update: (id: string, payload: Record<string, unknown>) =>
    requestWithAuth<{ habit: Habit; conflict: boolean }>({
      method: 'PUT',
      url: `/habits/${id}`,
      data: payload,
    }),
  delete: (id: string) =>
    requestWithAuth<{ message: string }>({ method: 'DELETE', url: `/habits/${id}` }),
  restore: (id: string) =>
    requestWithAuth<{ message: string }>({ method: 'POST', url: `/habits/${id}/restore` }),
  complete: (id: string, payload: { timestamp: string; note?: string; clientUpdatedAt?: string }) =>
    requestWithAuth<{ completionId: string; conflict: boolean; stats: Habit['stats'] }>({
      method: 'POST',
      url: `/habits/${id}/complete`,
      data: payload,
    }),
  history: (id: string, params?: { from?: string; to?: string }) =>
    requestWithAuth<{ history: Array<{ id: string; completedAt: string; note?: string }> }>({
      method: 'GET',
      url: `/habits/${id}/history`,
      params,
    }),
};

export const analyticsApi = {
  heatmap: (params?: { from?: string; to?: string; tag?: string }) =>
    requestWithAuth<{ heatmap: Array<{ date: string; count: number }> }>({
      method: 'GET',
      url: '/analytics/heatmap',
      params,
    }),
  streaks: () =>
    requestWithAuth<{ habits: Array<{ habitId: string; title: string; currentStreak: number; bestStreak: number; completionRate: number }> }>({
      method: 'GET',
      url: '/analytics/streaks',
    }),
  trends: (params?: { period?: 'week' | 'month'; months?: number }) =>
    requestWithAuth<{ trend: Array<{ periodStart: string; count: number }> }>({
      method: 'GET',
      url: '/analytics/trends',
      params,
    }),
};

export const settingsApi = {
  get: () => requestWithAuth<{ settings: Record<string, unknown> }>({ method: 'GET', url: '/settings' }),
  update: (payload: Record<string, unknown>) =>
    requestWithAuth<{ settings: Record<string, unknown> }>({
      method: 'PUT',
      url: '/settings',
      data: payload,
    }),
};

export const notificationsApi = {
  getPreferences: () =>
    requestWithAuth<{ preferences: { email: boolean; push: boolean; sms: boolean } }>({
      method: 'GET',
      url: '/notifications/preferences',
    }),
  updatePreferences: (payload: { email?: boolean; push?: boolean; sms?: boolean }) =>
    requestWithAuth({
      method: 'PUT',
      url: '/notifications/preferences',
      data: payload,
    }),
  subscribePush: (payload: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    requestWithAuth({ method: 'POST', url: '/notifications/push/subscribe', data: payload }),
  unsubscribePush: (endpoint: string) =>
    requestWithAuth({ method: 'DELETE', url: '/notifications/push/subscribe', data: { endpoint } }),
  sendTest: (channels: Array<'email' | 'push'>) =>
    requestWithAuth({ method: 'POST', url: '/notifications/test', data: { channels } }),
};

export const templatesApi = {
  list: () => api.get('/templates').then((response) => response.data),
  apply: (templates: string[]) =>
    requestWithAuth<{ message: string; count: number }>({
      method: 'POST',
      url: '/templates/apply',
      data: { templates },
    }),
};

export const adminApi = {
  users: () => requestWithAuth<{ users: Array<Record<string, unknown>> }>({ method: 'GET', url: '/admin/users' }),
  metrics: () => requestWithAuth<{ users: number; habits: number; completions: number; activeUsers7d: number }>({ method: 'GET', url: '/admin/metrics' }),
  broadcast: (payload: { title: string; body: string }) =>
    requestWithAuth<{ message: string; recipientCount: number }>({
      method: 'POST',
      url: '/admin/broadcast',
      data: payload,
    }),
};

export const exportApi = {
  downloadCsv: async () => {
    const state = useAuthStore.getState();
    const response = await api.get('/exports/history?format=csv', {
      responseType: 'blob',
      headers: {
        Authorization: state.accessToken ? `Bearer ${state.accessToken}` : undefined,
      },
    });
    return response.data as Blob;
  },
  json: () =>
    requestWithAuth<{ exportedAt: string; rows: Array<Record<string, unknown>> }>({
      method: 'GET',
      url: '/exports/history',
      params: { format: 'json' },
    }),
  importJson: (payload: Record<string, unknown>) =>
    requestWithAuth<{ message: string }>({
      method: 'POST',
      url: '/exports/import',
      data: payload,
    }),
};

export const syncApi = {
  syncOperations: (operations: Array<Record<string, unknown>>) =>
    requestWithAuth<{ syncedAt: string; results: Array<Record<string, unknown>> }>({
      method: 'POST',
      url: '/sync/operations',
      data: { operations },
    }),
  state: () => requestWithAuth<{ serverTime: string; lastMutationAt: string | null }>({ method: 'GET', url: '/sync/state' }),
};

export const socialApi = {
  createSnapshot: (payload: { habitId?: string; title: string; payload: Record<string, unknown> }) =>
    requestWithAuth<{ snapshotId: string; shareUrl: string }>({
      method: 'POST',
      url: '/social/snapshots',
      data: payload,
    }),
  getSnapshot: (id: string) => api.get(`/social/snapshots/${id}`).then((response) => response.data),
  leaderboard: () => api.get('/social/leaderboard').then((response) => response.data),
};

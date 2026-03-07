import { BarChart3, Bell, CalendarDays, Home, LogOut, Settings, Shield, Sparkles } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/Button';

const links = [
  { to: '/app', icon: Home, label: 'Dashboard' },
  { to: '/app/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/app/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/app/notifications', icon: Bell, label: 'Notifications' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  async function onLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearSession();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-canvas text-text">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Habit Tracker</p>
            <h1 className="text-lg font-bold">Build consistency daily</h1>
          </div>
          <div className="flex items-center gap-2">
            {!navigator.onLine ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                Offline mode
              </span>
            ) : null}
            <Button variant="ghost" onClick={() => navigate('/app/onboarding')}>
              <Sparkles className="mr-2 h-4 w-4" />
              Onboarding
            </Button>
            {user?.role === 'ADMIN' ? (
              <Button variant="ghost" onClick={() => navigate('/app/admin')}>
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                void onLogout().then(() => toast.success('Logged out'));
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-5 md:grid-cols-[220px_1fr] md:px-6">
        <aside className="rounded-2xl border border-border bg-surface p-2 shadow-card">
          <nav className="space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/app'}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-accent text-white' : 'text-text hover:bg-canvas'
                  }`
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

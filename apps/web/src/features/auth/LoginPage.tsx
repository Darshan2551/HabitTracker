import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AuthLayout } from './AuthLayout';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const googleRef = useRef<HTMLDivElement | null>(null);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setSession({
        user: data.user,
        accessToken: data.accessToken,
        csrfToken: data.csrfToken,
      });
      toast.success('Welcome back');
      const next = (location.state as { from?: string } | null)?.from ?? '/app';
      navigate(next, { replace: true });
    },
    onError: () => toast.error('Invalid email or password'),
  });

  const googleMutation = useMutation({
    mutationFn: authApi.loginWithGoogle,
    onSuccess: (data) => {
      setSession({
        user: data.user,
        accessToken: data.accessToken,
        csrfToken: data.csrfToken,
      });
      toast.success('Signed in with Google');
      navigate('/app', { replace: true });
    },
    onError: () => toast.error('Google sign-in failed'),
  });

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google || !googleRef.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) {
          googleMutation.mutate(response.credential);
        }
      },
    });
    window.google.accounts.id.renderButton(googleRef.current, {
      theme: 'outline',
      shape: 'pill',
      text: 'continue_with',
    });
  }, [googleMutation]);

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Access your habits, streaks, and reminders.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          loginMutation.mutate({ email, password });
        }}
      >
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" className="w-full" loading={loginMutation.isPending}>
          Sign in
        </Button>
      </form>

      <div className="my-4 flex items-center gap-2">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div ref={googleRef} className="flex justify-center" />

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link to="/forgot-password" className="font-medium text-accent hover:underline">
          Forgot password?
        </Link>
        <Link to="/register" className="font-medium text-accent hover:underline">
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
}

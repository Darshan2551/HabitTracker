import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AuthLayout } from './AuthLayout';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      toast.success('Account created. Verify your email and sign in.');
      navigate('/login');
    },
    onError: () => {
      toast.error('Failed to register');
    },
  });

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Create account</h1>
      <p className="mt-1 text-sm text-muted">Start tracking habits in under 60 seconds.</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}
      >
        <Input
          label="Name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          required
        />
        <p className="text-xs text-muted">
          Password must be 10+ characters and include upper, lower, number, and symbol.
        </p>
        <Button type="submit" className="w-full" loading={mutation.isPending}>
          Sign up
        </Button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

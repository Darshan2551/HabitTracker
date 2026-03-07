import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AuthLayout } from './AuthLayout';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') ?? '', [params]);
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: (value: string) => authApi.confirmReset(token, value),
    onSuccess: () => {
      toast.success('Password updated');
      navigate('/login');
    },
    onError: () => toast.error('Invalid or expired reset token'),
  });

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      {!token ? (
        <p className="mt-3 text-sm text-rose-500">Missing reset token. Please request a new reset email.</p>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(password);
          }}
        >
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button type="submit" className="w-full" loading={mutation.isPending}>
            Update password
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm">
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

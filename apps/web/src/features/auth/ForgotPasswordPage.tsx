import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AuthLayout } from './AuthLayout';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const mutation = useMutation({
    mutationFn: authApi.requestReset,
    onSuccess: () => toast.success('If the account exists, reset instructions were sent.'),
    onError: () => toast.error('Unable to send reset email'),
  });

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Reset password</h1>
      <p className="mt-1 text-sm text-muted">Enter your account email to receive a reset link.</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(email);
        }}
      >
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Button type="submit" className="w-full" loading={mutation.isPending}>
          Send reset link
        </Button>
      </form>
      <p className="mt-4 text-sm">
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

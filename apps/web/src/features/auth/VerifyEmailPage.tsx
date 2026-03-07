import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { authApi } from '@/lib/api';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const mutation = useMutation({
    mutationFn: authApi.verifyEmail,
  });

  useEffect(() => {
    if (token) {
      mutation.mutate(token);
    }
  }, [mutation, token]);

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Email verification</h1>
      <p className="mt-2 text-sm text-muted">
        {mutation.isPending && 'Verifying your email...'}
        {mutation.isSuccess && 'Email verified. You can now sign in.'}
        {mutation.isError && 'Verification link is invalid or expired.'}
      </p>
      <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
        Go to sign in
      </Link>
    </AuthLayout>
  );
}

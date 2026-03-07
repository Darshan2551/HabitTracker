import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth-store';

export function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const [broadcast, setBroadcast] = useState({ title: '', body: '' });
  const metricsQuery = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: adminApi.metrics,
  });
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.users,
  });

  const broadcastMutation = useMutation({
    mutationFn: adminApi.broadcast,
    onSuccess: (data) => {
      toast.success(`Broadcast sent to ${data.recipientCount} users`);
      setBroadcast({ title: '', body: '' });
    },
    onError: () => toast.error('Failed to send broadcast'),
  });

  if (user?.role !== 'ADMIN') {
    return (
      <Card>
        <h2 className="text-xl font-bold">Admin access required</h2>
        <p className="mt-2 text-sm text-muted">Your account does not have admin privileges.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-xl font-bold">Platform metrics</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MetricCard label="Users" value={metricsQuery.data?.users ?? 0} />
          <MetricCard label="Habits" value={metricsQuery.data?.habits ?? 0} />
          <MetricCard label="Completions" value={metricsQuery.data?.completions ?? 0} />
          <MetricCard label="Active 7d" value={metricsQuery.data?.activeUsers7d ?? 0} />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Broadcast message</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            broadcastMutation.mutate(broadcast);
          }}
        >
          <Input
            label="Title"
            value={broadcast.title}
            onChange={(event) => setBroadcast((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Body</span>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              rows={4}
              value={broadcast.body}
              onChange={(event) => setBroadcast((prev) => ({ ...prev, body: event.target.value }))}
              required
            />
          </label>
          <Button type="submit" loading={broadcastMutation.isPending}>
            Send broadcast
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Recent users</h2>
        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Verified</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data?.users ?? []).slice(0, 50).map((user: Record<string, unknown>) => (
                <tr key={String(user.id)} className="border-b border-border/50">
                  <td className="py-2">{String(user.email)}</td>
                  <td className="py-2">{String(user.role)}</td>
                  <td className="py-2">{String(Boolean(user.emailVerified))}</td>
                  <td className="py-2">{String(user.createdAt).slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

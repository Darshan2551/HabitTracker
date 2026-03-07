import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { habitsApi } from '@/lib/api';
import { queueOperation } from '@/lib/offline-sync';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

dayjs.extend(utc);

export function HabitDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { habitId = '' } = useParams();
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['habit', habitId],
    queryFn: () => habitsApi.get(habitId),
    enabled: Boolean(habitId),
  });

  const historyQuery = useQuery({
    queryKey: ['habit', habitId, 'history'],
    queryFn: () => habitsApi.history(habitId),
    enabled: Boolean(habitId),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      try {
        return await habitsApi.complete(habitId, {
          timestamp: new Date().toISOString(),
          note,
          clientUpdatedAt: data?.habit.updatedAt,
        });
      } catch {
        await queueOperation({
          type: 'complete_habit',
          entityId: habitId,
          payload: {
            timestamp: new Date().toISOString(),
            note,
          },
        });
        return null;
      }
    },
    onSuccess: () => {
      setNote('');
      toast.success('Completion saved');
      void queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { title: string; description?: string }) =>
      habitsApi.update(habitId, { ...payload, updatedAt: data?.habit.updatedAt }),
    onSuccess: (response) => {
      toast.success(response.conflict ? 'Saved with server conflict warning' : 'Habit updated');
      void queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => habitsApi.delete(habitId),
    onSuccess: () => {
      toast.success('Habit moved to recovery window');
      navigate('/app');
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  if (isLoading || !data) {
    return <Card>Loading habit details...</Card>;
  }

  const habit = data.habit;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{habit.title}</h2>
            <p className="mt-1 text-sm text-muted">{habit.description || 'No description yet'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/app')}>
              Back
            </Button>
            <Button variant="danger" onClick={() => deleteMutation.mutate()} loading={deleteMutation.isPending}>
              Delete
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-canvas p-3">
            <p className="text-xs text-muted">Current streak</p>
            <p className="text-2xl font-bold">{habit.stats?.currentStreak ?? 0}</p>
          </div>
          <div className="rounded-xl bg-canvas p-3">
            <p className="text-xs text-muted">Best streak</p>
            <p className="text-2xl font-bold">{habit.stats?.bestStreak ?? 0}</p>
          </div>
          <div className="rounded-xl bg-canvas p-3">
            <p className="text-xs text-muted">Completion rate</p>
            <p className="text-2xl font-bold">{habit.stats?.completionRate ?? 0}%</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Mark completion</h3>
        <form
          className="mt-3 flex flex-col gap-2 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            completeMutation.mutate();
          }}
        >
          <Input
            placeholder="Optional note..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" loading={completeMutation.isPending}>
            Complete now
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Edit habit</h3>
        <HabitEditForm
          key={habit.id}
          title={habit.title}
          description={habit.description}
          onSave={(payload) => updateMutation.mutate(payload)}
          loading={updateMutation.isPending}
        />
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">History</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {(historyQuery.data?.history ?? []).slice(0, 20).map((entry) => (
            <li key={entry.id} className="rounded-lg border border-border bg-canvas px-3 py-2">
              <p className="font-semibold">{dayjs(entry.completedAt).format('DD MMM YYYY, HH:mm')}</p>
              <p className="text-muted">{entry.note || 'No note'}</p>
            </li>
          ))}
          {(historyQuery.data?.history ?? []).length === 0 ? (
            <li className="text-muted">No completion history yet.</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}

function HabitEditForm({
  title,
  description,
  onSave,
  loading,
}: {
  title: string;
  description?: string;
  onSave: (payload: { title: string; description?: string }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ title, description: description ?? '' });
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          title: form.title,
          description: form.description,
        });
      }}
    >
      <Input
        label="Title"
        value={form.title}
        onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
      />
      <Input
        label="Description"
        value={form.description}
        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
      />
      <Button type="submit" loading={loading}>
        Save changes
      </Button>
    </form>
  );
}

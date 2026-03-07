import confetti from 'canvas-confetti';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { habitsApi, type Habit } from '@/lib/api';
import { queueOperation } from '@/lib/offline-sync';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

dayjs.extend(utc);

function isCompletedToday(habit: Habit): boolean {
  return (
    habit.completions?.some((completion) => dayjs(completion.completedAt).utc().isSame(dayjs().utc(), 'day')) ??
    false
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState({
    title: '',
    type: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
    interval: 1,
    days: '1,3,5',
    time: '08:00',
    customRule: 'every_n_days' as 'every_n_days' | 'weekdays' | 'weekends',
  });
  const [filter, setFilter] = useState<'today' | 'week' | 'overdue'>('today');

  const { data, isLoading } = useQuery({
    queryKey: ['habits', filter],
    queryFn: () => habitsApi.list({ filter }),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const days = createForm.days
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item));
      const schedule =
        createForm.type === 'daily'
          ? { type: 'daily', interval: createForm.interval, time: createForm.time }
          : createForm.type === 'weekly'
            ? { type: 'weekly', days: days.length ? days : [1], intervalWeeks: createForm.interval, time: createForm.time }
            : createForm.type === 'monthly'
              ? {
                  type: 'monthly',
                  days: days.length ? days : [1],
                  intervalMonths: createForm.interval,
                  time: createForm.time,
                }
              : {
                  type: 'custom',
                  rule: createForm.customRule,
                  interval: createForm.interval,
                  time: createForm.time,
                };
      return habitsApi.create({
        title: createForm.title,
        schedule,
      });
    },
    onSuccess: () => {
      setCreateForm((prev) => ({ ...prev, title: '' }));
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Habit created');
    },
    onError: async () => {
      if (!createForm.title.trim()) return;
      await queueOperation({
        type: 'create_habit',
        payload: {
          title: createForm.title,
          schedule: { type: createForm.type, interval: createForm.interval, time: createForm.time },
        },
      });
      toast('Saved offline. Will sync automatically.');
      setCreateForm((prev) => ({ ...prev, title: '' }));
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (habit: Habit) => {
      const timestamp = new Date().toISOString();
      try {
        await habitsApi.complete(habit.id, { timestamp, clientUpdatedAt: habit.updatedAt });
      } catch {
        await queueOperation({
          type: 'complete_habit',
          entityId: habit.id,
          payload: { timestamp, note: 'Offline completion' },
        });
      }
    },
    onSuccess: () => {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.65 } });
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const habits = data?.habits ?? [];
  const completedCount = useMemo(() => habits.filter(isCompletedToday).length, [habits]);
  const completionRatio = habits.length === 0 ? 0 : Math.round((completedCount / habits.length) * 100);

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {filter === 'today' ? "Today's focus" : filter === 'week' ? 'This week' : 'Overdue'}
            </h2>
            <p className="text-sm text-muted">
              {completedCount}/{habits.length} completed
            </p>
            <div className="mt-3 flex gap-2">
              {(['today', 'week', 'overdue'] as const).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={filter === item ? 'primary' : 'secondary'}
                  className="px-3 py-1 text-xs"
                  onClick={() => setFilter(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <div className="w-full max-w-xl">
            <form
              className="grid gap-2 md:grid-cols-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (!createForm.title.trim()) return;
                createMutation.mutate();
              }}
            >
              <Input
                aria-label="Quick add habit"
                placeholder="Habit title..."
                value={createForm.title}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                className="md:col-span-2"
              />
              <select
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                value={createForm.type}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    type: event.target.value as typeof prev.type,
                  }))
                }
              >
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
                <option value="custom">custom</option>
              </select>
              <Input
                aria-label="Interval"
                type="number"
                min={1}
                value={createForm.interval}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, interval: Number(event.target.value) || 1 }))
                }
              />
              <Input
                aria-label="Days list"
                placeholder="Days (e.g. 1,3,5)"
                value={createForm.days}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, days: event.target.value }))}
              />
              <Button type="submit" loading={createMutation.isPending} className="w-full">
                Add
              </Button>
            </form>
          </div>
        </div>
        <div className="mt-4 h-3 rounded-full bg-canvas">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${completionRatio}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-4">
        {isLoading ? <Card>Loading habits...</Card> : null}
        {!isLoading && habits.length === 0 ? <Card>No habits due today. Add one above.</Card> : null}
        {habits.map((habit) => {
          const completed = isCompletedToday(habit);
          return (
            <Card key={habit.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <Link to={`/app/habits/${habit.id}`} className="text-lg font-semibold hover:underline">
                  {habit.title}
                </Link>
                <p className="text-sm text-muted">{habit.description || 'No description'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-canvas px-2 py-1 text-xs text-muted">
                    Streak: {habit.stats?.currentStreak ?? 0}
                  </span>
                  <span className="rounded-full bg-canvas px-2 py-1 text-xs text-muted">
                    Completion: {habit.stats?.completionRate ?? 0}%
                  </span>
                </div>
              </div>
              <Button
                variant={completed ? 'secondary' : 'primary'}
                onClick={() => completeMutation.mutate(habit)}
                disabled={completeMutation.isPending}
              >
                {completed ? 'Completed' : 'Mark complete'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

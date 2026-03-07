import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';

export function AnalyticsPage() {
  const heatmapQuery = useQuery({
    queryKey: ['analytics', 'heatmap'],
    queryFn: () => analyticsApi.heatmap(),
  });
  const streakQuery = useQuery({
    queryKey: ['analytics', 'streaks'],
    queryFn: () => analyticsApi.streaks(),
  });
  const trendQuery = useQuery({
    queryKey: ['analytics', 'trend'],
    queryFn: () => analyticsApi.trends({ period: 'week', months: 6 }),
  });

  const leaderboard = useMemo(
    () =>
      (streakQuery.data?.habits ?? [])
        .slice()
        .sort((a, b) => b.currentStreak - a.currentStreak)
        .slice(0, 5),
    [streakQuery.data?.habits],
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">Weekly completion trend</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendQuery.data?.trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodStart" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--color-accent)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Streak leaderboard</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaderboard}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="currentStreak" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="text-lg font-semibold">Monthly heatmap</h3>
        <p className="text-sm text-muted">Completion intensity over the last months.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10">
          {(heatmapQuery.data?.heatmap ?? []).slice(-70).map((entry) => (
            <div
              key={entry.date}
              className="rounded-lg border border-border p-2 text-center text-xs"
              style={{
                background:
                  entry.count >= 3
                    ? 'rgba(14, 165, 233, 0.92)'
                    : entry.count === 2
                      ? 'rgba(14, 165, 233, 0.5)'
                      : entry.count === 1
                        ? 'rgba(14, 165, 233, 0.2)'
                        : 'transparent',
              }}
            >
              <p>{entry.date.slice(5)}</p>
              <p className="text-muted">{entry.count}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

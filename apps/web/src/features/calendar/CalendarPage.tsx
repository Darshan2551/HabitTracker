import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';

dayjs.extend(utc);

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export function CalendarPage() {
  const [value, setValue] = useState<Value>(new Date());
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'heatmap'],
    queryFn: () => analyticsApi.heatmap(),
  });

  const map = useMemo(
    () =>
      new Map(
        (data?.heatmap ?? []).map((entry) => [dayjs(entry.date).utc().format('YYYY-MM-DD'), entry.count]),
      ),
    [data?.heatmap],
  );

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-xl font-bold">Calendar view</h2>
        <p className="text-sm text-muted">Browse your completion history day by day.</p>
        <div className="mt-4">
          <Calendar
            onChange={setValue}
            value={value}
            className="habit-calendar !w-full rounded-xl border border-border bg-surface p-3"
            tileClassName={({ date }) => {
              const key = dayjs(date).utc().format('YYYY-MM-DD');
              const count = map.get(key) ?? 0;
              if (count >= 3) return '!bg-emerald-500 !text-white';
              if (count === 2) return '!bg-emerald-300';
              if (count === 1) return '!bg-emerald-100';
              return '';
            }}
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Heatmap preview</h3>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted">Loading heatmap data...</p>
        ) : (
          <div className="mt-3 grid grid-cols-7 gap-2">
            {(data?.heatmap ?? []).slice(-35).map((entry) => (
              <div
                key={entry.date}
                className="rounded-md border border-border p-2 text-center text-xs"
                style={{
                  background:
                    entry.count >= 3
                      ? 'rgba(16, 185, 129, 0.9)'
                      : entry.count === 2
                        ? 'rgba(16, 185, 129, 0.5)'
                        : entry.count === 1
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'transparent',
                }}
              >
                <p>{dayjs(entry.date).format('DD')}</p>
                <p className="text-[10px] text-muted">{entry.count}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

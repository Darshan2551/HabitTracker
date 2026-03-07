import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { z } from 'zod';

dayjs.extend(utc);

export const scheduleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('daily'),
    interval: z.number().int().min(1).max(365).default(1),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }),
  z.object({
    type: z.literal('weekly'),
    days: z.array(z.number().int().min(0).max(6)).min(1),
    intervalWeeks: z.number().int().min(1).max(52).default(1),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }),
  z.object({
    type: z.literal('monthly'),
    days: z.array(z.number().int().min(1).max(31)).min(1),
    intervalMonths: z.number().int().min(1).max(12).default(1),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }),
  z.object({
    type: z.literal('custom'),
    rule: z.enum(['every_n_days', 'weekdays', 'weekends']),
    interval: z.number().int().min(1).max(365).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }),
]);

export type HabitSchedule = z.infer<typeof scheduleSchema>;

function dayKey(date: dayjs.Dayjs): string {
  return date.utc().format('YYYY-MM-DD');
}

function normalizeSchedule(input: unknown): HabitSchedule {
  return scheduleSchema.parse(input);
}

export function isHabitDueOnDate(params: {
  schedule: unknown;
  date: Date;
  anchorDate?: Date;
}): boolean {
  const schedule = normalizeSchedule(params.schedule);
  const date = dayjs(params.date).utc().startOf('day');
  const anchor = dayjs(params.anchorDate ?? params.date).utc().startOf('day');

  if (schedule.type === 'daily') {
    const delta = Math.max(date.diff(anchor, 'day'), 0);
    return delta % schedule.interval === 0;
  }

  if (schedule.type === 'weekly') {
    const day = date.day();
    if (!schedule.days.includes(day)) {
      return false;
    }
    const weekDelta = Math.max(date.startOf('week').diff(anchor.startOf('week'), 'week'), 0);
    return weekDelta % schedule.intervalWeeks === 0;
  }

  if (schedule.type === 'monthly') {
    if (!schedule.days.includes(date.date())) {
      return false;
    }
    const monthDelta = Math.max(date.startOf('month').diff(anchor.startOf('month'), 'month'), 0);
    return monthDelta % schedule.intervalMonths === 0;
  }

  if (schedule.rule === 'weekdays') {
    const d = date.day();
    return d >= 1 && d <= 5;
  }

  if (schedule.rule === 'weekends') {
    const d = date.day();
    return d === 0 || d === 6;
  }

  const interval = schedule.interval ?? 1;
  const delta = Math.max(date.diff(anchor, 'day'), 0);
  return delta % interval === 0;
}

function getDueDays(params: {
  schedule: unknown;
  startDate: Date;
  endDate: Date;
  anchorDate?: Date;
}): string[] {
  const start = dayjs(params.startDate).utc().startOf('day');
  const end = dayjs(params.endDate).utc().startOf('day');
  const due: string[] = [];

  for (let current = start; current.isBefore(end) || current.isSame(end); current = current.add(1, 'day')) {
    if (isHabitDueOnDate({ schedule: params.schedule, date: current.toDate(), anchorDate: params.anchorDate })) {
      due.push(dayKey(current));
    }
  }

  return due;
}

export function calculateStreak(params: {
  schedule: unknown;
  completions: Date[];
  startDate: Date;
  now?: Date;
  graceDays?: number;
  anchorDate?: Date;
}): { currentStreak: number; bestStreak: number; completionRate: number } {
  const now = params.now ? dayjs(params.now).utc() : dayjs().utc();
  const dueDays = getDueDays({
    schedule: params.schedule,
    startDate: params.startDate,
    endDate: now.toDate(),
    anchorDate: params.anchorDate,
  });

  const completed = new Set(params.completions.map((c) => dayjs(c).utc().format('YYYY-MM-DD')));
  const grace = Math.max(params.graceDays ?? 0, 0);

  let best = 0;
  let running = 0;
  let missed = 0;

  for (const due of dueDays) {
    if (completed.has(due)) {
      running += 1;
      missed = 0;
      best = Math.max(best, running);
      continue;
    }

    if (missed < grace) {
      missed += 1;
      continue;
    }

    running = 0;
    missed = 0;
  }

  let current = 0;
  missed = 0;
  for (let index = dueDays.length - 1; index >= 0; index -= 1) {
    const due = dueDays[index];
    if (completed.has(due)) {
      current += 1;
      continue;
    }
    if (missed < grace) {
      missed += 1;
      continue;
    }
    break;
  }

  const completionRate = dueDays.length === 0 ? 0 : Math.round((completed.size / dueDays.length) * 100);
  return {
    currentStreak: current,
    bestStreak: best,
    completionRate,
  };
}

export function groupCompletionsByDay(dates: Date[]): Record<string, number> {
  return dates.reduce<Record<string, number>>((acc, date) => {
    const key = dayjs(date).utc().format('YYYY-MM-DD');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

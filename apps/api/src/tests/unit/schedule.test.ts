import { describe, expect, it } from 'vitest';
import { calculateStreak, isHabitDueOnDate } from '../../utils/schedule.js';

describe('schedule utilities', () => {
  it('handles daily interval schedules', () => {
    const anchor = new Date('2026-01-01T00:00:00Z');
    expect(
      isHabitDueOnDate({
        schedule: { type: 'daily', interval: 2 },
        date: new Date('2026-01-03T12:00:00Z'),
        anchorDate: anchor,
      }),
    ).toBe(true);

    expect(
      isHabitDueOnDate({
        schedule: { type: 'daily', interval: 2 },
        date: new Date('2026-01-04T12:00:00Z'),
        anchorDate: anchor,
      }),
    ).toBe(false);
  });

  it('handles weekly day-of-week schedules', () => {
    expect(
      isHabitDueOnDate({
        schedule: { type: 'weekly', days: [1, 3, 5], intervalWeeks: 1 },
        date: new Date('2026-02-11T08:00:00Z'), // Wednesday
        anchorDate: new Date('2026-02-01T00:00:00Z'),
      }),
    ).toBe(true);
  });

  it('handles custom every_n_days schedules', () => {
    expect(
      isHabitDueOnDate({
        schedule: { type: 'custom', rule: 'every_n_days', interval: 3 },
        date: new Date('2026-02-07T00:00:00Z'),
        anchorDate: new Date('2026-02-01T00:00:00Z'),
      }),
    ).toBe(true);
  });

  it('computes streak and completion rate', () => {
    const result = calculateStreak({
      schedule: { type: 'daily', interval: 1 },
      completions: [
        new Date('2026-03-01T00:00:00Z'),
        new Date('2026-03-02T00:00:00Z'),
        new Date('2026-03-04T00:00:00Z'),
      ],
      startDate: new Date('2026-03-01T00:00:00Z'),
      now: new Date('2026-03-04T23:59:59Z'),
      graceDays: 0,
    });

    expect(result.bestStreak).toBe(2);
    expect(result.currentStreak).toBe(1);
    expect(result.completionRate).toBe(75);
  });
});

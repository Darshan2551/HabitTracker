import { z } from 'zod';
import { scheduleSchema } from '../../utils/schedule.js';

const goalSchema = z
  .object({
    type: z.enum(['count', 'duration']),
    value: z.number().positive(),
    period: z.enum(['day', 'week', 'month']),
  })
  .optional();

const reminderSchema = z.object({
  channel: z.enum(['EMAIL', 'PUSH', 'SMS']),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  days: z.array(z.number().int().min(0).max(6)).optional(),
  enabled: z.boolean().default(true),
});

export const createHabitSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(1_000).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  isPublic: z.boolean().optional(),
  schedule: scheduleSchema,
  goal: goalSchema,
  graceDays: z.number().int().min(0).max(7).optional(),
  vacationMode: z.boolean().optional(),
  snoozedUntil: z.coerce.date().optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
  reminders: z.array(reminderSchema).optional(),
});

export const updateHabitSchema = createHabitSchema.partial().extend({
  updatedAt: z.coerce.date().optional(),
});

export const completeHabitSchema = z.object({
  timestamp: z.coerce.date().default(() => new Date()),
  note: z.string().max(1_000).optional(),
  source: z.enum(['MANUAL', 'BACKFILL', 'OFFLINE_SYNC']).optional(),
  clientUpdatedAt: z.coerce.date().optional(),
});

export const listHabitsQuerySchema = z.object({
  filter: z.enum(['all', 'today', 'week', 'overdue']).optional(),
  tag: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional(),
});

export const historyQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

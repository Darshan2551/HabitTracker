import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import type { FastifyInstance } from 'fastify';
import { calculateStreak, isHabitDueOnDate } from '../../utils/schedule.js';

dayjs.extend(utc);

export function createHabitsService(fastify: FastifyInstance) {
  async function resolveTags(userId: string, names?: string[]): Promise<string[]> {
    if (!names || names.length === 0) {
      return [];
    }

    const unique = Array.from(new Set(names.map((n) => n.trim().toLowerCase())));
    const tags = await Promise.all(
      unique.map((name) =>
        fastify.prisma.tag.upsert({
          where: { userId_name: { userId, name } },
          update: {},
          create: {
            userId,
            name,
          },
        }),
      ),
    );
    return tags.map((tag) => tag.id);
  }

  async function createHabit(
    userId: string,
    input: {
      title: string;
      description?: string;
      color?: string;
      difficulty?: number;
      isPublic?: boolean;
      schedule: unknown;
      goal?: unknown;
      graceDays?: number;
      vacationMode?: boolean;
      snoozedUntil?: Date;
      tags?: string[];
      reminders?: Array<{ channel: 'EMAIL' | 'PUSH' | 'SMS'; timeOfDay: string; days?: number[]; enabled?: boolean }>;
    },
  ) {
    const tagIds = await resolveTags(userId, input.tags);

    const habit = await fastify.prisma.habit.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        color: input.color,
        difficulty: input.difficulty,
        isPublic: input.isPublic ?? false,
        schedule: input.schedule,
        goal: input.goal,
        graceDays: input.graceDays ?? 0,
        vacationMode: input.vacationMode ?? false,
        snoozedUntil: input.snoozedUntil,
        tags: tagIds.length
          ? {
              createMany: {
                data: tagIds.map((tagId) => ({ tagId })),
              },
            }
          : undefined,
        reminders: input.reminders
          ? {
              create: input.reminders.map((reminder) => ({
                channel: reminder.channel,
                timeOfDay: reminder.timeOfDay,
                days: reminder.days as any,
                enabled: reminder.enabled ?? true,
                userId,
              })),
            }
          : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        reminders: true,
      },
    });

    await fastify.prisma.auditLog.create({
      data: {
        userId,
        habitId: habit.id,
        action: 'HABIT_CREATED',
      },
    });

    return habit;
  }

  async function listHabits(
    userId: string,
    filter: 'all' | 'today' | 'week' | 'overdue' = 'all',
    tag?: string,
    includeDeleted = false,
  ) {
    const habits = await fastify.prisma.habit.findMany({
      where: {
        userId,
        deletedAt: includeDeleted ? undefined : null,
        tags: tag
          ? {
              some: {
                tag: {
                  name: tag.toLowerCase(),
                },
              },
            }
          : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        completions: {
          where: {
            deletedAt: null,
            completedAt: {
              gte: dayjs().utc().subtract(90, 'day').toDate(),
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const withStats = habits.map((habit) => ({
      ...habit,
      stats: calculateStreak({
        schedule: habit.schedule,
        completions: habit.completions.map((completion) => completion.completedAt),
        startDate: habit.createdAt,
        graceDays: habit.graceDays,
        anchorDate: habit.createdAt,
      }),
    }));

    if (filter === 'all') {
      return withStats;
    }

    const today = dayjs().utc().startOf('day');
    const endOfWeek = today.add(7, 'day');

    return withStats.filter((habit) => {
      const dueToday = isHabitDueOnDate({
        schedule: habit.schedule,
        date: today.toDate(),
        anchorDate: habit.createdAt,
      });

      if (filter === 'today') {
        return dueToday;
      }

      if (filter === 'week') {
        for (let current = today; current.isBefore(endOfWeek); current = current.add(1, 'day')) {
          if (
            isHabitDueOnDate({
              schedule: habit.schedule,
              date: current.toDate(),
              anchorDate: habit.createdAt,
            })
          ) {
            return true;
          }
        }
        return false;
      }

      if (filter === 'overdue') {
        if (!dueToday) {
          return false;
        }
        return !habit.completions.some((completion) =>
          dayjs(completion.completedAt).utc().isSame(today, 'day'),
        );
      }

      return true;
    });
  }

  async function getHabitDetails(userId: string, habitId: string) {
    const habit = await fastify.prisma.habit.findFirst({
      where: {
        id: habitId,
        userId,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        reminders: true,
        completions: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            completedAt: 'desc',
          },
        },
      },
    });

    if (!habit || habit.deletedAt) {
      return null;
    }

    const streak = calculateStreak({
      schedule: habit.schedule,
      completions: habit.completions.map((completion) => completion.completedAt),
      startDate: habit.createdAt,
      graceDays: habit.graceDays,
      anchorDate: habit.createdAt,
    });

    return {
      ...habit,
      stats: streak,
    };
  }

  async function updateHabit(
    userId: string,
    habitId: string,
    input: {
      title?: string;
      description?: string;
      color?: string;
      difficulty?: number;
      isPublic?: boolean;
      schedule?: unknown;
      goal?: unknown;
      graceDays?: number;
      vacationMode?: boolean;
      snoozedUntil?: Date;
      tags?: string[];
      reminders?: Array<{ channel: 'EMAIL' | 'PUSH' | 'SMS'; timeOfDay: string; days?: number[]; enabled?: boolean }>;
      updatedAt?: Date;
    },
  ): Promise<{ habit: Awaited<ReturnType<typeof getHabitDetails>>; conflict: boolean }> {
    const existing = await fastify.prisma.habit.findFirst({
      where: {
        id: habitId,
        userId,
        deletedAt: null,
      },
      include: {
        reminders: true,
      },
    });
    if (!existing) {
      throw new Error('Habit not found');
    }

    const conflict = !!input.updatedAt && existing.updatedAt > input.updatedAt;
    const tagIds = await resolveTags(userId, input.tags);

    await fastify.prisma.$transaction(async (tx) => {
      await tx.habit.update({
        where: { id: habitId },
        data: {
          title: input.title,
          description: input.description,
          color: input.color,
          difficulty: input.difficulty,
          isPublic: input.isPublic,
          schedule: input.schedule,
          goal: input.goal,
          graceDays: input.graceDays,
          vacationMode: input.vacationMode,
          snoozedUntil: input.snoozedUntil,
        },
      });

      if (input.tags) {
        await tx.habitTag.deleteMany({
          where: { habitId },
        });
        if (tagIds.length) {
          await tx.habitTag.createMany({
            data: tagIds.map((tagId) => ({ habitId, tagId })),
          });
        }
      }

      if (input.reminders) {
        await tx.reminder.deleteMany({
          where: { habitId },
        });
        await tx.reminder.createMany({
          data: input.reminders.map((reminder) => ({
            habitId,
            userId,
            channel: reminder.channel,
            timeOfDay: reminder.timeOfDay,
            days: reminder.days as any,
            enabled: reminder.enabled ?? true,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          habitId,
          action: conflict ? 'HABIT_UPDATED_WITH_CONFLICT' : 'HABIT_UPDATED',
          metadata: conflict
            ? {
                clientUpdatedAt: input.updatedAt?.toISOString(),
                serverUpdatedAt: existing.updatedAt.toISOString(),
              }
            : undefined,
        },
      });
    });

    const habit = await getHabitDetails(userId, habitId);
    return { habit, conflict };
  }

  async function softDeleteHabit(userId: string, habitId: string): Promise<void> {
    const habit = await fastify.prisma.habit.findFirst({
      where: { id: habitId, userId, deletedAt: null },
    });
    if (!habit) {
      throw new Error('Habit not found');
    }

    await fastify.prisma.$transaction([
      fastify.prisma.habit.update({
        where: { id: habitId },
        data: {
          deletedAt: new Date(),
        },
      }),
      fastify.prisma.auditLog.create({
        data: {
          userId,
          habitId,
          action: 'HABIT_DELETED',
        },
      }),
    ]);
  }

  async function restoreHabit(userId: string, habitId: string): Promise<void> {
    const habit = await fastify.prisma.habit.findFirst({
      where: { id: habitId, userId },
    });
    if (!habit || !habit.deletedAt) {
      throw new Error('Deleted habit not found');
    }

    const canRestore = dayjs(habit.deletedAt).utc().isAfter(dayjs().utc().subtract(30, 'day'));
    if (!canRestore) {
      throw new Error('Recovery window expired');
    }

    await fastify.prisma.$transaction([
      fastify.prisma.habit.update({
        where: { id: habitId },
        data: {
          deletedAt: null,
        },
      }),
      fastify.prisma.auditLog.create({
        data: {
          userId,
          habitId,
          action: 'HABIT_RESTORED',
        },
      }),
    ]);
  }

  async function markCompletion(
    userId: string,
    habitId: string,
    input: {
      timestamp: Date;
      note?: string;
      source?: 'MANUAL' | 'BACKFILL' | 'OFFLINE_SYNC';
      clientUpdatedAt?: Date;
    },
  ): Promise<{ completionId: string; conflict: boolean; stats: { currentStreak: number; bestStreak: number; completionRate: number } }> {
    const habit = await fastify.prisma.habit.findFirst({
      where: {
        id: habitId,
        userId,
        deletedAt: null,
      },
      include: {
        completions: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            completedAt: 'desc',
          },
        },
      },
    });
    if (!habit) {
      throw new Error('Habit not found');
    }

    const completionDay = dayjs(input.timestamp).utc().startOf('day');
    const existing = await fastify.prisma.completion.findFirst({
      where: {
        habitId,
        userId,
        deletedAt: null,
        completedAt: {
          gte: completionDay.toDate(),
          lt: completionDay.add(1, 'day').toDate(),
        },
      },
    });

    const conflict = !!input.clientUpdatedAt && existing ? existing.updatedAt > input.clientUpdatedAt : false;

    const completion = existing
      ? await fastify.prisma.completion.update({
          where: { id: existing.id },
          data: {
            note: input.note,
            completedAt: input.timestamp,
            source: input.source ?? 'MANUAL',
            conflictAt: conflict ? new Date() : null,
          },
        })
      : await fastify.prisma.completion.create({
          data: {
            habitId,
            userId,
            note: input.note,
            completedAt: input.timestamp,
            source: input.source ?? 'MANUAL',
            conflictAt: conflict ? new Date() : null,
          },
        });

    await fastify.prisma.auditLog.create({
      data: {
        userId,
        habitId,
        completionId: completion.id,
        action: existing ? 'COMPLETION_UPDATED' : 'COMPLETION_CREATED',
        metadata: {
          backfill: completionDay.isBefore(dayjs().utc().startOf('day')),
          conflict,
        },
      },
    });

    const completions = await fastify.prisma.completion.findMany({
      where: {
        habitId,
        userId,
        deletedAt: null,
      },
      select: {
        completedAt: true,
      },
    });

    const stats = calculateStreak({
      schedule: habit.schedule,
      completions: completions.map((item) => item.completedAt),
      startDate: habit.createdAt,
      graceDays: habit.graceDays,
      anchorDate: habit.createdAt,
    });

    return {
      completionId: completion.id,
      conflict,
      stats,
    };
  }

  async function listCompletionHistory(
    userId: string,
    habitId: string,
    from?: Date,
    to?: Date,
  ) {
    return fastify.prisma.completion.findMany({
      where: {
        habitId,
        userId,
        deletedAt: null,
        completedAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });
  }

  return {
    createHabit,
    listHabits,
    getHabitDetails,
    updateHabit,
    softDeleteHabit,
    restoreHabit,
    markCompletion,
    listCompletionHistory,
  };
}

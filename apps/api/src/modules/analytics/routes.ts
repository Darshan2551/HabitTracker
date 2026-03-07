import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { calculateStreak } from '../../utils/schedule.js';

dayjs.extend(utc);

const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  tag: z.string().optional(),
});

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/heatmap',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const query = rangeSchema.parse(request.query);
      const from = query.from ?? dayjs().utc().subtract(6, 'month').startOf('day').toDate();
      const to = query.to ?? dayjs().utc().endOf('day').toDate();

      const completions = await fastify.prisma.completion.findMany({
        where: {
          userId: request.user.sub,
          deletedAt: null,
          completedAt: {
            gte: from,
            lte: to,
          },
          habit: query.tag
            ? {
                tags: {
                  some: {
                    tag: {
                      name: query.tag.toLowerCase(),
                    },
                  },
                },
              }
            : undefined,
        },
        select: {
          completedAt: true,
        },
      });

      const buckets = new Map<string, number>();
      for (const completion of completions) {
        const key = dayjs(completion.completedAt).utc().format('YYYY-MM-DD');
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }

      const heatmap = Array.from(buckets.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([date, count]) => ({ date, count }));

      return reply.send({ from, to, heatmap });
    },
  );

  fastify.get(
    '/streaks',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const habits = await fastify.prisma.habit.findMany({
        where: {
          userId: request.user.sub,
          deletedAt: null,
        },
        include: {
          completions: {
            where: {
              deletedAt: null,
            },
            select: {
              completedAt: true,
            },
          },
        },
      });

      const data = habits.map((habit) => ({
        habitId: habit.id,
        title: habit.title,
        ...calculateStreak({
          schedule: habit.schedule,
          completions: habit.completions.map((completion) => completion.completedAt),
          startDate: habit.createdAt,
          graceDays: habit.graceDays,
          anchorDate: habit.createdAt,
        }),
      }));

      return reply.send({ habits: data });
    },
  );

  fastify.get(
    '/trends',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const query = z
        .object({
          period: z.enum(['week', 'month']).default('week'),
          months: z.coerce.number().int().min(1).max(24).default(6),
        })
        .parse(request.query);

      const start = dayjs()
        .utc()
        .subtract(query.months, 'month')
        .startOf('month')
        .toDate();

      const completions = await fastify.prisma.completion.findMany({
        where: {
          userId: request.user.sub,
          deletedAt: null,
          completedAt: {
            gte: start,
          },
        },
        select: {
          completedAt: true,
        },
      });

      const grouping = new Map<string, number>();
      for (const completion of completions) {
        const key =
          query.period === 'week'
            ? dayjs(completion.completedAt).utc().startOf('week').format('YYYY-MM-DD')
            : dayjs(completion.completedAt).utc().startOf('month').format('YYYY-MM-DD');
        grouping.set(key, (grouping.get(key) ?? 0) + 1);
      }

      const trend = Array.from(grouping.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([periodStart, count]) => ({ periodStart, count }));

      return reply.send({ period: query.period, trend });
    },
  );
};

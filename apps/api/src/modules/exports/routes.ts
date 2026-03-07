import type { FastifyPluginAsync } from 'fastify';
import { Parser } from 'json2csv';
import { z } from 'zod';

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
});

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/history',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const query = exportQuerySchema.parse(request.query);
      const completions = await fastify.prisma.completion.findMany({
        where: {
          userId: request.user.sub,
          deletedAt: null,
        },
        include: {
          habit: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          completedAt: 'asc',
        },
      });

      const rows = completions.map((completion) => ({
        id: completion.id,
        habitId: completion.habitId,
        habitTitle: completion.habit.title,
        completedAt: completion.completedAt.toISOString(),
        note: completion.note ?? '',
        source: completion.source,
      }));

      if (query.format === 'json') {
        return reply.send({
          exportedAt: new Date().toISOString(),
          rows,
        });
      }

      const parser = new Parser({
        fields: ['id', 'habitId', 'habitTitle', 'completedAt', 'note', 'source'],
      });
      const csv = parser.parse(rows);

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename=\"habit-history-${Date.now()}.csv\"`);
      return reply.send(csv);
    },
  );

  fastify.post(
    '/import',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const payload = z
        .object({
          habits: z
            .array(
              z.object({
                title: z.string(),
                description: z.string().optional(),
                schedule: z.any(),
                goal: z.any().optional(),
                color: z.string().optional(),
              }),
            )
            .default([]),
          completions: z
            .array(
              z.object({
                habitTitle: z.string(),
                completedAt: z.coerce.date(),
                note: z.string().optional(),
              }),
            )
            .default([]),
        })
        .parse(request.body);

      const titleToHabitId = new Map<string, string>();
      await fastify.prisma.$transaction(async (tx) => {
        for (const habit of payload.habits) {
          const created = await tx.habit.create({
            data: {
              userId: request.user.sub,
              title: habit.title,
              description: habit.description,
              schedule: habit.schedule,
              goal: habit.goal,
              color: habit.color,
            },
          });
          titleToHabitId.set(habit.title.toLowerCase(), created.id);
        }

        for (const completion of payload.completions) {
          const habitId = titleToHabitId.get(completion.habitTitle.toLowerCase());
          if (!habitId) {
            continue;
          }
          await tx.completion.create({
            data: {
              userId: request.user.sub,
              habitId,
              completedAt: completion.completedAt,
              note: completion.note,
              source: 'OFFLINE_SYNC',
            },
          });
        }
      });

      await fastify.prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          action: 'DATA_IMPORTED',
          metadata: {
            habits: payload.habits.length,
            completions: payload.completions.length,
          },
        },
      });

      return reply.send({ message: 'Import completed' });
    },
  );
};

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  completeHabitSchema,
  createHabitSchema,
  historyQuerySchema,
  listHabitsQuerySchema,
  updateHabitSchema,
} from './schemas.js';
import { createHabitsService } from './service.js';

const habitParamsSchema = z.object({
  id: z.string().uuid(),
});

export const habitRoutes: FastifyPluginAsync = async (fastify) => {
  const service = createHabitsService(fastify);

  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const query = listHabitsQuerySchema.parse(request.query);
      const habits = await service.listHabits(
        request.user.sub,
        query.filter ?? 'all',
        query.tag,
        query.includeDeleted ?? false,
      );
      return reply.send({ habits });
    },
  );

  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const payload = createHabitSchema.parse(request.body);
      const habit = await service.createHabit(request.user.sub, {
        ...payload,
        schedule: payload.schedule,
        goal: payload.goal,
      });
      return reply.code(201).send({ habit });
    },
  );

  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const params = habitParamsSchema.parse(request.params);
      const habit = await service.getHabitDetails(request.user.sub, params.id);
      if (!habit) {
        return reply.code(404).send({ message: 'Habit not found' });
      }
      return reply.send({ habit });
    },
  );

  fastify.put(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const params = habitParamsSchema.parse(request.params);
      const payload = updateHabitSchema.parse(request.body);
      const { habit, conflict } = await service.updateHabit(request.user.sub, params.id, {
        ...payload,
        schedule: payload.schedule,
        goal: payload.goal,
      });
      return reply.send({ habit, conflict });
    },
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const params = habitParamsSchema.parse(request.params);
      await service.softDeleteHabit(request.user.sub, params.id);
      return reply.send({ message: 'Habit deleted. Recoverable for 30 days.' });
    },
  );

  fastify.post(
    '/:id/restore',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const params = habitParamsSchema.parse(request.params);
      await service.restoreHabit(request.user.sub, params.id);
      return reply.send({ message: 'Habit restored' });
    },
  );

  fastify.post(
    '/:id/complete',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const params = habitParamsSchema.parse(request.params);
      const payload = completeHabitSchema.parse(request.body ?? {});
      const result = await service.markCompletion(request.user.sub, params.id, {
        timestamp: payload.timestamp,
        note: payload.note,
        source: payload.source,
        clientUpdatedAt: payload.clientUpdatedAt,
      });
      return reply.code(201).send(result);
    },
  );

  fastify.post(
    '/:id/snooze',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const params = habitParamsSchema.parse(request.params);
      const payload = z
        .object({
          until: z.coerce.date(),
        })
        .parse(request.body);
      const { habit } = await service.updateHabit(request.user.sub, params.id, {
        snoozedUntil: payload.until,
      });
      return reply.send({ habit, message: 'Habit snoozed' });
    },
  );

  fastify.post(
    '/:id/skip',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const params = habitParamsSchema.parse(request.params);
      await fastify.prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          habitId: params.id,
          action: 'HABIT_SKIPPED',
          metadata: request.body as Record<string, unknown>,
        },
      });
      return reply.send({ message: 'Habit skipped for today' });
    },
  );

  fastify.get(
    '/:id/history',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const params = habitParamsSchema.parse(request.params);
      const query = historyQuerySchema.parse(request.query);
      const history = await service.listCompletionHistory(
        request.user.sub,
        params.id,
        query.from,
        query.to,
      );
      return reply.send({ history });
    },
  );

  fastify.get(
    '/:id/audit',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const params = habitParamsSchema.parse(request.params);
      const logs = await fastify.prisma.auditLog.findMany({
        where: {
          userId: request.user.sub,
          habitId: params.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });
      return reply.send({ logs });
    },
  );
};

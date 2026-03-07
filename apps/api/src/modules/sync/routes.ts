import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createHabitsService } from '../habits/service.js';

const operationSchema = z.object({
  operationId: z.string().min(1),
  type: z.enum(['create_habit', 'update_habit', 'delete_habit', 'complete_habit']),
  entityId: z.string().optional(),
  payload: z.record(z.any()),
  clientUpdatedAt: z.coerce.date().optional(),
});

export const syncRoutes: FastifyPluginAsync = async (fastify) => {
  const habitService = createHabitsService(fastify);

  fastify.post(
    '/operations',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = z.object({ operations: z.array(operationSchema).max(200) }).parse(request.body);
      const results: Array<{
        operationId: string;
        status: 'ok' | 'error';
        conflict?: boolean;
        message?: string;
      }> = [];

      for (const op of body.operations) {
        try {
          if (op.type === 'create_habit') {
            await habitService.createHabit(request.user.sub, {
              title: String(op.payload.title),
              description: op.payload.description ? String(op.payload.description) : undefined,
              color: op.payload.color ? String(op.payload.color) : undefined,
              schedule: op.payload.schedule,
              goal: op.payload.goal,
              tags: Array.isArray(op.payload.tags)
                ? op.payload.tags.map((item: unknown) => String(item))
                : undefined,
              reminders: Array.isArray(op.payload.reminders)
                ? op.payload.reminders.map((reminder: Record<string, unknown>) => ({
                    channel: String(reminder.channel) as 'EMAIL' | 'PUSH' | 'SMS',
                    timeOfDay: String(reminder.timeOfDay),
                    days: Array.isArray(reminder.days)
                      ? reminder.days.map((day) => Number(day))
                      : undefined,
                    enabled:
                      typeof reminder.enabled === 'boolean' ? reminder.enabled : undefined,
                  }))
                : undefined,
            });
            results.push({ operationId: op.operationId, status: 'ok' });
            continue;
          }

          if (!op.entityId) {
            throw new Error('entityId is required');
          }

          if (op.type === 'update_habit') {
            const { conflict } = await habitService.updateHabit(request.user.sub, op.entityId, {
              ...(op.payload as Record<string, unknown>),
              updatedAt: op.clientUpdatedAt,
            });
            results.push({ operationId: op.operationId, status: 'ok', conflict });
            continue;
          }

          if (op.type === 'delete_habit') {
            await habitService.softDeleteHabit(request.user.sub, op.entityId);
            results.push({ operationId: op.operationId, status: 'ok' });
            continue;
          }

          if (op.type === 'complete_habit') {
            const result = await habitService.markCompletion(request.user.sub, op.entityId, {
              timestamp: op.payload.timestamp
                ? new Date(String(op.payload.timestamp))
                : new Date(),
              note: op.payload.note ? String(op.payload.note) : undefined,
              source: 'OFFLINE_SYNC',
              clientUpdatedAt: op.clientUpdatedAt,
            });
            results.push({
              operationId: op.operationId,
              status: 'ok',
              conflict: result.conflict,
            });
          }
        } catch (error) {
          results.push({
            operationId: op.operationId,
            status: 'error',
            message: error instanceof Error ? error.message : 'Sync operation failed',
          });
        }
      }

      return reply.send({
        syncedAt: new Date().toISOString(),
        results,
      });
    },
  );

  fastify.get(
    '/state',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const latestAudit = await fastify.prisma.auditLog.findFirst({
        where: {
          userId: request.user.sub,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return reply.send({
        serverTime: new Date().toISOString(),
        lastMutationAt: latestAudit?.createdAt ?? null,
      });
    },
  );
};

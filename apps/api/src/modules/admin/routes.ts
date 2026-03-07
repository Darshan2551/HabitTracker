import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendEmail } from '../../utils/mailer.js';

dayjs.extend(utc);

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/users',
    {
      preHandler: [fastify.adminOnly],
    },
    async (_request, reply) => {
      const users = await fastify.prisma.user.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          emailVerified: true,
          timezone: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 500,
      });
      return reply.send({ users });
    },
  );

  fastify.get(
    '/metrics',
    {
      preHandler: [fastify.adminOnly],
    },
    async (_request, reply) => {
      const sevenDaysAgo = dayjs().utc().subtract(7, 'day').toDate();
      const [users, habits, completions, activeUsers] = await Promise.all([
        fastify.prisma.user.count({ where: { deletedAt: null } }),
        fastify.prisma.habit.count({ where: { deletedAt: null } }),
        fastify.prisma.completion.count({ where: { deletedAt: null } }),
        fastify.prisma.completion.groupBy({
          by: ['userId'],
          where: {
            completedAt: {
              gte: sevenDaysAgo,
            },
            deletedAt: null,
          },
        }),
      ]);

      return reply.send({
        users,
        habits,
        completions,
        activeUsers7d: activeUsers.length,
      });
    },
  );

  fastify.post(
    '/broadcast',
    {
      preHandler: [fastify.adminOnly],
    },
    async (request, reply) => {
      const payload = z
        .object({
          title: z.string().min(3).max(120),
          body: z.string().min(5).max(10_000),
        })
        .parse(request.body);

      const broadcast = await fastify.prisma.broadcastMessage.create({
        data: {
          authorId: request.user.sub,
          title: payload.title,
          body: payload.body,
        },
      });

      const recipients = await fastify.prisma.user.findMany({
        where: {
          deletedAt: null,
          settings: {
            emailNotifications: true,
          },
        },
        select: {
          email: true,
        },
        take: 5_000,
      });

      await Promise.all(
        recipients.map((recipient) =>
          sendEmail({
            to: recipient.email,
            subject: `[Habit Tracker] ${payload.title}`,
            html: `<p>${payload.body}</p>`,
          }).catch(() => undefined),
        ),
      );

      await fastify.prisma.broadcastMessage.update({
        where: { id: broadcast.id },
        data: {
          deliveredAt: new Date(),
        },
      });

      return reply.send({
        message: 'Broadcast sent',
        recipientCount: recipients.length,
      });
    },
  );
};

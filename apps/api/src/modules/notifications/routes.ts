import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendEmail } from '../../utils/mailer.js';
import { sendWebPush } from '../../utils/push.js';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/preferences',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const settings = await fastify.prisma.userSettings.findUnique({
        where: {
          userId: request.user.sub,
        },
      });

      return reply.send({
        preferences: {
          email: settings?.emailNotifications ?? true,
          push: settings?.pushNotifications ?? false,
          sms: settings?.smsNotifications ?? false,
        },
      });
    },
  );

  fastify.put(
    '/preferences',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const payload = z
        .object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
          sms: z.boolean().optional(),
        })
        .parse(request.body);

      const settings = await fastify.prisma.userSettings.upsert({
        where: { userId: request.user.sub },
        update: {
          emailNotifications: payload.email,
          pushNotifications: payload.push,
          smsNotifications: payload.sms,
        },
        create: {
          userId: request.user.sub,
          emailNotifications: payload.email ?? true,
          pushNotifications: payload.push ?? false,
          smsNotifications: payload.sms ?? false,
        },
      });

      return reply.send({ preferences: settings });
    },
  );

  fastify.post(
    '/push/subscribe',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const payload = subscriptionSchema.parse(request.body);
      await fastify.prisma.pushSubscription.upsert({
        where: {
          endpoint: payload.endpoint,
        },
        update: {
          p256dh: payload.keys.p256dh,
          auth: payload.keys.auth,
          userId: request.user.sub,
        },
        create: {
          userId: request.user.sub,
          endpoint: payload.endpoint,
          p256dh: payload.keys.p256dh,
          auth: payload.keys.auth,
        },
      });

      await fastify.prisma.userSettings.upsert({
        where: { userId: request.user.sub },
        update: { pushNotifications: true },
        create: { userId: request.user.sub, pushNotifications: true },
      });

      return reply.send({ message: 'Push subscription saved' });
    },
  );

  fastify.delete(
    '/push/subscribe',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const payload = z.object({ endpoint: z.string().url() }).parse(request.body);
      await fastify.prisma.pushSubscription.deleteMany({
        where: {
          userId: request.user.sub,
          endpoint: payload.endpoint,
        },
      });
      return reply.send({ message: 'Push subscription removed' });
    },
  );

  fastify.post(
    '/test',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const payload = z
        .object({
          channels: z.array(z.enum(['email', 'push'])).default(['email']),
        })
        .parse(request.body);
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.sub },
      });
      if (!user) {
        return reply.code(404).send({ message: 'User not found' });
      }

      if (payload.channels.includes('email')) {
        await sendEmail({
          to: user.email,
          subject: 'Habit Tracker notification test',
          html: '<p>Your email notifications are configured correctly.</p>',
        });
      }

      if (payload.channels.includes('push')) {
        const subscriptions = await fastify.prisma.pushSubscription.findMany({
          where: {
            userId: request.user.sub,
          },
        });
        await Promise.all(
          subscriptions.map((sub) =>
            sendWebPush(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              {
                title: 'Habit Tracker test',
                body: 'Push notifications are configured correctly.',
              },
            ),
          ),
        );
      }

      return reply.send({ message: 'Test notification sent' });
    },
  );
};

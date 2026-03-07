import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  themeMode: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  palette: z.string().min(1).max(40).optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  fontScale: z.number().min(0.8).max(1.4).optional(),
  timezone: z.string().min(1).max(100).optional(),
  locale: z.string().min(2).max(20).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  accessibilityReduceMotion: z.boolean().optional(),
  accessibilityHighContrast: z.boolean().optional(),
});

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const settings = await fastify.prisma.userSettings.findUnique({
        where: {
          userId: request.user.sub,
        },
      });

      if (!settings) {
        const created = await fastify.prisma.userSettings.create({
          data: {
            userId: request.user.sub,
          },
        });
        return reply.send({ settings: created });
      }

      return reply.send({ settings });
    },
  );

  fastify.put(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const payload = updateSettingsSchema.parse(request.body);

      const settings = await fastify.prisma.userSettings.upsert({
        where: {
          userId: request.user.sub,
        },
        update: payload,
        create: {
          userId: request.user.sub,
          ...payload,
        },
      });

      if (payload.timezone || payload.locale) {
        await fastify.prisma.user.update({
          where: {
            id: request.user.sub,
          },
          data: {
            timezone: payload.timezone,
            locale: payload.locale,
          },
        });
      }

      return reply.send({ settings });
    },
  );
};

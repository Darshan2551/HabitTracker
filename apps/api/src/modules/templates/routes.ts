import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_request, reply) => {
    const templates = await fastify.prisma.habitTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return reply.send({ templates });
  });

  fastify.post(
    '/apply',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const payload = z
        .object({
          templates: z.array(z.string().min(1)).min(1),
        })
        .parse(request.body);

      const templates = await fastify.prisma.habitTemplate.findMany({
        where: {
          slug: {
            in: payload.templates,
          },
        },
      });

      await fastify.prisma.$transaction(
        templates.map((template) =>
          fastify.prisma.habit.create({
            data: {
              userId: request.user.sub,
              title: template.title,
              description: template.description,
              schedule: template.schedule,
              goal: template.goal,
            },
          }),
        ),
      );

      await fastify.prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          action: 'TEMPLATES_APPLIED',
          metadata: {
            templates: payload.templates,
          },
        },
      });

      return reply.send({ message: 'Templates applied', count: templates.length });
    },
  );
};

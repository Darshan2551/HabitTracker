import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/live', async () => ({ status: 'ok', uptime: process.uptime() }));

  fastify.get('/ready', async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      await fastify.redis.ping();
      return reply.send({ status: 'ready' });
    } catch {
      return reply.code(503).send({ status: 'not-ready' });
    }
  });
};

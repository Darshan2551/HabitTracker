import fp from 'fastify-plugin';

export const authPlugin = fp(async (fastify) => {
  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  fastify.decorate('adminOnly', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'ADMIN') {
        reply.code(403).send({ message: 'Forbidden' });
      }
    } catch {
      reply.code(401).send({ message: 'Unauthorized' });
    }
  });
});

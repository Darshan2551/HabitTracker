import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { env } from '../config/env.js';

export const redisPlugin = fp(async (fastify) => {
  const redis = new (Redis as any)(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  });

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
});

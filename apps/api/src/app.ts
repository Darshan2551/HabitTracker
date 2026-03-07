import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { adminRoutes } from './modules/admin/routes.js';
import { analyticsRoutes } from './modules/analytics/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { exportRoutes } from './modules/exports/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { habitRoutes } from './modules/habits/routes.js';
import { notificationsRoutes } from './modules/notifications/routes.js';
import { settingsRoutes } from './modules/settings/routes.js';
import { socialRoutes } from './modules/social/routes.js';
import { syncRoutes } from './modules/sync/routes.js';
import { templatesRoutes } from './modules/templates/routes.js';
import { authPlugin } from './plugins/auth.js';
import { prismaPlugin } from './plugins/prisma.js';
import { redisPlugin } from './plugins/redis.js';
import { swaggerPlugin } from './plugins/swagger.js';
import { enqueueDueReminders, reminderQueue, startReminderWorker } from './queues/reminder.queue.js';

export async function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
              },
            },
          }
        : true,
  });

  await app.register(cors, {
    origin: [env.APP_URL],
    credentials: true,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
  await app.register(cookie);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(jwt as any, {
    secret: env.JWT_ACCESS_SECRET,
    verify: {
      allowedIss: 'habittracker',
      allowedAud: 'habittracker-web',
    },
  });
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    redis: app.redis,
    keyGenerator: (request) => request.ip,
  });
  await app.register(swaggerPlugin);
  await app.register(authPlugin);

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') {
      return;
    }
    const sensitiveMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!sensitiveMethods.includes(request.method)) {
      return;
    }
    const csrfCookie = request.cookies.habittracker_csrf;
    if (!csrfCookie) {
      return;
    }
    if (request.url.startsWith('/api/auth/login') || request.url.startsWith('/api/auth/register')) {
      return;
    }
    if (
      request.url.startsWith('/api/auth/reset') ||
      request.url.startsWith('/api/auth/verify-email') ||
      request.url.startsWith('/api/auth/oauth/google')
    ) {
      return;
    }
    const csrfHeader = String(request.headers['x-csrf-token'] ?? '');
    if (csrfHeader !== csrfCookie) {
      reply.code(403).send({ message: 'Invalid CSRF token' });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        message: 'Validation failed',
        issues: error.flatten(),
      });
    }

    app.log.error(error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return reply.code(500).send({
      message,
    });
  });

  app.get('/', async () => ({
    name: 'Habit Tracker API',
    docs: '/docs',
    status: 'ok',
  }));

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(habitRoutes, { prefix: '/api/habits' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(exportRoutes, { prefix: '/api/exports' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(templatesRoutes, { prefix: '/api/templates' });
  await app.register(socialRoutes, { prefix: '/api/social' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(syncRoutes, { prefix: '/api/sync' });

  let reminderWorker: ReturnType<typeof startReminderWorker> | undefined;
  let reminderInterval: NodeJS.Timeout | undefined;

  if (env.NODE_ENV !== 'test') {
    reminderWorker = startReminderWorker(app);
    reminderInterval = setInterval(() => {
      enqueueDueReminders(app).catch((error) => app.log.error(error));
    }, 60_000);
  }

  app.addHook('onClose', async () => {
    if (reminderInterval) {
      clearInterval(reminderInterval);
    }
    if (reminderWorker) {
      await reminderWorker.close();
    }
    await reminderQueue.close();
  });

  return app;
}

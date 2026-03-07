import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  confirmResetSchema,
  googleOAuthSchema,
  loginSchema,
  registerSchema,
  requestResetSchema,
  verifyEmailSchema,
} from './schemas.js';
import { createAuthService } from './service.js';

const REFRESH_COOKIE = 'habittracker_rt';
const CSRF_COOKIE = 'habittracker_csrf';

function setAuthCookies(
  reply: FastifyReply,
  values: { refreshToken: string; csrfToken: string },
): void {
  reply.setCookie(REFRESH_COOKIE, values.refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  reply.setCookie(CSRF_COOKIE, values.csrfToken, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = createAuthService(fastify);

  fastify.post('/register', async (request, reply) => {
    const payload = registerSchema.parse(request.body);
    const user = await authService.register(payload);

    await fastify.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AUTH_REGISTER',
        metadata: {
          email: user.email,
        },
      },
    });

    return reply.code(201).send({
      message: 'Registration successful. Please verify your email.',
    });
  });

  fastify.post('/verify-email', async (request, reply) => {
    const payload = verifyEmailSchema.parse(request.body);
    await authService.verifyEmail(payload.token);
    return reply.send({ message: 'Email verified' });
  });

  fastify.post('/login', async (request, reply) => {
    const payload = loginSchema.parse(request.body);
    const key = `login-attempt:${payload.email.toLowerCase()}`;
    const attempts = Number((await fastify.redis.get(key)) ?? '0');
    if (attempts >= 5) {
      return reply.code(429).send({ message: 'Too many failed login attempts' });
    }

    try {
      const result = await authService.login(payload, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      await fastify.redis.del(key);
      setAuthCookies(reply, result.tokens);
      return reply.send({
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        csrfToken: result.tokens.csrfToken,
      });
    } catch {
      await fastify.redis.multi().incr(key).expire(key, 15 * 60).exec();
      return reply.code(401).send({ message: 'Invalid credentials' });
    }
  });

  fastify.post('/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string().optional() }).parse(request.body ?? {});
    const refreshToken = body.refreshToken ?? request.cookies[REFRESH_COOKIE];
    const csrfFromCookie = request.cookies[CSRF_COOKIE];
    const csrfFromHeader = String(request.headers['x-csrf-token'] ?? '');

    if (!refreshToken || !csrfFromCookie || csrfFromHeader !== csrfFromCookie) {
      return reply.code(401).send({ message: 'Invalid refresh request' });
    }

    const result = await authService.refresh({
      refreshToken,
      csrfToken: csrfFromHeader,
    });
    setAuthCookies(reply, result.tokens);
    return reply.send({
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      csrfToken: result.tokens.csrfToken,
    });
  });

  fastify.post('/oauth/google', async (request, reply) => {
    const payload = googleOAuthSchema.parse(request.body);
    const result = await authService.loginWithGoogle(payload.idToken, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    setAuthCookies(reply, result.tokens);
    return reply.send({
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      csrfToken: result.tokens.csrfToken,
    });
  });

  fastify.post('/reset', async (request, reply) => {
    const payload = requestResetSchema.parse(request.body);
    await authService.requestPasswordReset(payload.email);
    return reply.send({
      message: 'If the account exists, a reset link has been sent.',
    });
  });

  fastify.post('/reset/confirm', async (request, reply) => {
    const payload = confirmResetSchema.parse(request.body);
    await authService.confirmPasswordReset(payload);
    return reply.send({ message: 'Password has been reset successfully' });
  });

  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE] ?? z.object({ refreshToken: z.string().optional() }).parse(request.body ?? {}).refreshToken;
    const csrfFromCookie = request.cookies[CSRF_COOKIE];
    const csrfFromHeader = String(request.headers['x-csrf-token'] ?? '');

    if (refreshToken && csrfFromCookie && csrfFromHeader === csrfFromCookie) {
      await authService.revokeRefreshToken(refreshToken);
    }

    reply.clearCookie(REFRESH_COOKIE, { path: '/' });
    reply.clearCookie(CSRF_COOKIE, { path: '/' });
    return reply.send({ message: 'Logged out' });
  });

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.sub },
      include: {
        settings: true,
      },
    });
    if (!user || user.deletedAt) {
      return reply.code(404).send({ message: 'User not found' });
    }
    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      timezone: user.timezone,
      locale: user.locale,
      settings: user.settings,
    });
  });

  fastify.delete('/account', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const csrfFromCookie = request.cookies[CSRF_COOKIE];
    const csrfFromHeader = String(request.headers['x-csrf-token'] ?? '');
    if (!csrfFromCookie || csrfFromCookie !== csrfFromHeader) {
      return reply.code(403).send({ message: 'Invalid CSRF token' });
    }
    await authService.deleteAccount(request.user.sub);
    reply.clearCookie(REFRESH_COOKIE, { path: '/' });
    reply.clearCookie(CSRF_COOKIE, { path: '/' });
    return reply.send({ message: 'Account deleted' });
  });
};

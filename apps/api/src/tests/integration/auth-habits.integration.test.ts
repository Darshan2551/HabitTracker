import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

function getCookieValue(setCookie: string[] | undefined, name: string): string | undefined {
  if (!setCookie) return undefined;
  const cookie = setCookie.find((line) => line.startsWith(`${name}=`));
  if (!cookie) return undefined;
  return cookie.split(';')[0].split('=')[1];
}

describeIntegration('auth + habits integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await app.prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "public_snapshots",
        "follows",
        "broadcast_messages",
        "audit_logs",
        "habit_templates",
        "push_subscriptions",
        "password_reset_tokens",
        "email_verification_tokens",
        "refresh_tokens",
        "user_settings",
        "reminders",
        "habit_tags",
        "tags",
        "completions",
        "habits",
        "users"
      RESTART IDENTITY CASCADE;
    `);
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports register -> login -> habit CRUD -> completion -> analytics', async () => {
    const email = `test-${randomUUID()}@example.com`;
    const password = 'StrongPass123!';

    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email,
        password,
        name: 'Integration User',
      },
    });
    expect(register.statusCode).toBe(201);

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email,
        password,
      },
    });
    expect(login.statusCode).toBe(200);

    const loginBody = login.json();
    const accessToken = loginBody.accessToken as string;
    expect(accessToken).toBeTruthy();

    const setCookie = login.headers['set-cookie'] as string[] | undefined;
    const refreshTokenCookie = getCookieValue(setCookie, 'habittracker_rt');
    const csrfCookie = getCookieValue(setCookie, 'habittracker_csrf');
    expect(refreshTokenCookie).toBeTruthy();
    expect(csrfCookie).toBeTruthy();

    const createHabit = await app.inject({
      method: 'POST',
      url: '/api/habits',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        title: 'Read 20 pages',
        schedule: { type: 'daily', interval: 1, time: '20:00' },
        goal: { type: 'count', value: 5, period: 'week' },
        tags: ['learning'],
      },
    });
    expect(createHabit.statusCode).toBe(201);

    const habitId = createHabit.json().habit.id as string;
    expect(habitId).toBeTruthy();

    const completeHabit = await app.inject({
      method: 'POST',
      url: `/api/habits/${habitId}/complete`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        timestamp: new Date().toISOString(),
        note: 'Completed through integration test',
      },
    });
    expect(completeHabit.statusCode).toBe(201);
    expect(completeHabit.json().stats.currentStreak).toBeGreaterThanOrEqual(1);

    const refresh = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        'x-csrf-token': csrfCookie ?? '',
        cookie: `habittracker_rt=${refreshTokenCookie}; habittracker_csrf=${csrfCookie}`,
      },
      payload: {},
    });
    expect(refresh.statusCode).toBe(200);
    expect(refresh.json().accessToken).toBeTruthy();

    const analytics = await app.inject({
      method: 'GET',
      url: '/api/analytics/heatmap',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    expect(analytics.statusCode).toBe(200);
    expect(Array.isArray(analytics.json().heatmap)).toBe(true);
  });
});

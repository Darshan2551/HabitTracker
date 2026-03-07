import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { parseDurationToMs, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { generateOpaqueToken, sha256 } from '../../utils/hash.js';
import { sendEmail } from '../../utils/mailer.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID || undefined);

function buildVerificationLink(token: string): string {
  return `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
}

function buildResetLink(token: string): string {
  return `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
}

type AuthContext = {
  ipAddress?: string;
  userAgent?: string;
};

export function createAuthService(fastify: FastifyInstance) {
  async function issueTokens(
    user: { id: string; email: string; role: 'USER' | 'ADMIN' },
    context?: AuthContext,
  ): Promise<{ accessToken: string; refreshToken: string; csrfToken: string }> {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const { token: refreshToken, jti } = signRefreshToken(user.id);
    const refreshTokenHash = sha256(refreshToken);
    const refreshExpiryMs = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);
    const expiresAt = new Date(Date.now() + refreshExpiryMs);
    const csrfToken = generateOpaqueToken(16);

    await Promise.all([
      fastify.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshTokenHash,
          expiresAt,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
      }),
      fastify.redis.set(`rt:${jti}`, refreshTokenHash, 'PX', refreshExpiryMs),
      fastify.redis.set(`csrf:${jti}`, csrfToken, 'PX', refreshExpiryMs),
    ]);

    return { accessToken, refreshToken, csrfToken };
  }

  async function revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const payload = verifyRefreshToken(rawRefreshToken);
    const tokenHash = sha256(rawRefreshToken);

    await Promise.all([
      fastify.prisma.refreshToken.updateMany({
        where: {
          userId: payload.sub,
          tokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
      fastify.redis.del(`rt:${payload.jti}`),
      fastify.redis.del(`csrf:${payload.jti}`),
    ]);
  }

  async function register(input: {
    email: string;
    password: string;
    name?: string;
    timezone?: string;
    locale?: string;
  }) {
    const existingUser = await fastify.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existingUser && !existingUser.deletedAt) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await fastify.prisma.user.upsert({
      where: { email: input.email.toLowerCase() },
      update: {
        deletedAt: null,
        passwordHash,
        name: input.name,
      },
      create: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        timezone: input.timezone ?? 'Asia/Kolkata',
        locale: input.locale ?? 'en-US',
        settings: {
          create: {
            timezone: input.timezone ?? 'Asia/Kolkata',
            locale: input.locale ?? 'en-US',
          },
        },
      },
    });

    const verificationToken = generateOpaqueToken();
    await fastify.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(verificationToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
      },
    });

    const verifyUrl = buildVerificationLink(verificationToken);
    await sendEmail({
      to: user.email,
      subject: 'Verify your Habit Tracker email',
      html: `<p>Welcome to Habit Tracker.</p><p>Verify your email by clicking <a href=\"${verifyUrl}\">this link</a>.</p>`,
    }).catch((error) => {
      fastify.log.warn({ error }, 'Failed to send verification email');
    });

    return user;
  }

  async function verifyEmail(token: string): Promise<void> {
    const tokenHash = sha256(token);
    const record = await fastify.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!record) {
      throw new Error('Invalid or expired verification token');
    }

    await fastify.prisma.$transaction([
      fastify.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      fastify.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async function login(
    input: { email: string; password: string },
    context?: AuthContext,
  ): Promise<{ user: { id: string; email: string; role: 'USER' | 'ADMIN'; emailVerified: boolean }; tokens: { accessToken: string; refreshToken: string; csrfToken: string } }> {
    const user = await fastify.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user || !user.passwordHash || user.deletedAt) {
      throw new Error('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    const tokens = await issueTokens(
      { id: user.id, email: user.email, role: user.role },
      {
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      tokens,
    };
  }

  async function refresh(input: { refreshToken: string; csrfToken: string }): Promise<{
    user: { id: string; email: string; role: 'USER' | 'ADMIN' };
    tokens: { accessToken: string; refreshToken: string; csrfToken: string };
  }> {
    const payload = verifyRefreshToken(input.refreshToken);
    const tokenHash = sha256(input.refreshToken);
    const [cachedHash, cachedCsrf, record] = await Promise.all([
      fastify.redis.get(`rt:${payload.jti}`),
      fastify.redis.get(`csrf:${payload.jti}`),
      fastify.prisma.refreshToken.findFirst({
        where: {
          userId: payload.sub,
          tokenHash,
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
      }),
    ]);

    if (!record || cachedHash !== tokenHash || cachedCsrf !== input.csrfToken) {
      throw new Error('Invalid refresh token');
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }

    await revokeRefreshToken(input.refreshToken);
    const tokens = await issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      tokens,
    };
  }

  async function requestPasswordReset(email: string): Promise<void> {
    const user = await fastify.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || user.deletedAt) {
      return;
    }

    const token = generateOpaqueToken();
    await fastify.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
      },
    });

    await sendEmail({
      to: user.email,
      subject: 'Reset your Habit Tracker password',
      html: `<p>You requested a password reset.</p><p>Continue <a href=\"${buildResetLink(token)}\">here</a>. If this was not you, ignore this email.</p>`,
    }).catch((error) => {
      fastify.log.warn({ error }, 'Failed to send password reset email');
    });
  }

  async function confirmPasswordReset(input: { token: string; newPassword: string }): Promise<void> {
    const tokenHash = sha256(input.token);
    const record = await fastify.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    if (!record) {
      throw new Error('Invalid or expired reset token');
    }

    await fastify.prisma.$transaction([
      fastify.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: await bcrypt.hash(input.newPassword, 12),
        },
      }),
      fastify.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async function loginWithGoogle(
    idToken: string,
    context?: AuthContext,
  ): Promise<{ user: { id: string; email: string; role: 'USER' | 'ADMIN' }; tokens: { accessToken: string; refreshToken: string; csrfToken: string } }> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth is not configured');
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new Error('Unable to verify Google account');
    }

    const user = await fastify.prisma.user.upsert({
      where: { email: payload.email.toLowerCase() },
      update: {
        googleId: payload.sub,
        emailVerified: true,
        name: payload.name ?? undefined,
        deletedAt: null,
      },
      create: {
        email: payload.email.toLowerCase(),
        name: payload.name ?? 'Google User',
        googleId: payload.sub,
        emailVerified: true,
        settings: {
          create: {},
        },
      },
    });

    const tokens = await issueTokens(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      context,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      tokens,
    };
  }

  async function deleteAccount(userId: string): Promise<void> {
    await fastify.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        publicProfileEnabled: false,
      },
    });
  }

  return {
    issueTokens,
    revokeRefreshToken,
    register,
    verifyEmail,
    login,
    refresh,
    requestPasswordReset,
    confirmPasswordReset,
    loginWithGoogle,
    deleteAccount,
  };
}

import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  type: 'refresh';
};

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: 'habittracker',
    audience: 'habittracker-web',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    ...options,
  });
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = nanoid();
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: 'habittracker',
    audience: 'habittracker-web',
  };
  const token = jwt.sign(
    {
      sub: userId,
      jti,
      type: 'refresh',
    } satisfies RefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    {
      ...options,
    },
  );

  return { token, jti };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'habittracker',
    audience: 'habittracker-web',
  }) as RefreshTokenPayload;
}

export function parseDurationToMs(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * multipliers[unit];
}

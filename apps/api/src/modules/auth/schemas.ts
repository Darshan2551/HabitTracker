import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(100).optional(),
  locale: z.string().min(2).max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
  csrfToken: z.string().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const requestResetSchema = z.object({
  email: z.string().email(),
});

export const confirmResetSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export const googleOAuthSchema = z.object({
  idToken: z.string().min(10),
});

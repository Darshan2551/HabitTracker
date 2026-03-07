import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://postgres:postgres@localhost:5432/habittracker'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default('change-this-access-secret-32-characters-minimum'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .default('change-this-refresh-secret-32-characters-minimum'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('Habit Tracker <noreply@habittracker.local>'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().default(''),
  WEB_PUSH_PUBLIC_KEY: z.string().default(''),
  WEB_PUSH_PRIVATE_KEY: z.string().default(''),
  WEB_PUSH_SUBJECT: z.string().default('mailto:security@habittracker.local'),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  ADMIN_EMAIL: z.string().email().default('admin@habittracker.local'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

Object.assign(process.env, parsed.data);

export const env = parsed.data;

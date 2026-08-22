import { config } from 'dotenv';
config();

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  LATE_CHECKIN_THRESHOLD: z.string().default('10:30'),
  COMPANY_NAME: z.string().default('Dayflow'),
  COMPANY_CODE: z.string().min(2).max(4).default('DF'),
  BOOTSTRAP_HR_EMAIL: z.string().email().optional(),
  BOOTSTRAP_HR_PASSWORD: z.string().min(12).optional(),
  BOOTSTRAP_HR_FIRST_NAME: z.string().default('HR'),
  BOOTSTRAP_HR_LAST_NAME: z.string().default('Administrator'),
  RUN_SEED_ON_START: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((v) => v === 'true'),
  SEED_DEMO_DATA: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}

export const env = loadEnv();

import { config } from 'dotenv';
config();

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('2h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  LATE_CHECKIN_THRESHOLD: z.string().default('10:30'),
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

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1).default('dev-secret-change'),
  MONGO_URL: z.string().default('mongodb://localhost:27017'),
  MONGO_DB: z.string().min(1).default('turbineops'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates process.env once at startup. Keeps invalid configuration from reaching request handlers.
 */
export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}

import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    /** Access token TTL (jsonwebtoken `expiresIn` string). Refresh tokens can reuse separate secret/TTL later. */
    JWT_EXPIRES_IN: z.string().default('8h'),
    /** Optional standard JWT issuer (`iss`). If set, tokens are verified with the same issuer. */
    JWT_ISSUER: z.string().min(1).optional(),
    /** Optional JWT audience (`aud`). If set, verification requires `aud`. */
    JWT_AUDIENCE: z.string().min(1).optional(),
    MONGO_URL: z.string().default('mongodb://localhost:27017'),
    MONGO_DB: z.string().min(1).default('turbineops'),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production' && val.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_SECRET must be at least 32 characters in production',
        path: ['JWT_SECRET'],
      });
    }
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

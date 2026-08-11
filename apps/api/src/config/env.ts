/**
 * Environment configuration.
 *
 * Parsed and validated once at process start. A missing or malformed variable
 * kills the process immediately with a readable message, instead of surfacing
 * hours later as `undefined` deep inside a request handler.
 */
import 'dotenv/config';
import { z } from 'zod';

/**
 * Only variables the API actually reads are listed here. Storage, video and
 * payment keys join this schema in the modules that consume them — validating
 * a variable nobody uses yet would block startup for no reason.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // 32 chars is the practical floor for an HS256 key: the algorithm uses
  // HMAC-SHA256, so a shorter secret weakens the signature.
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // Comma-separated list of allowed browser origins.
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    // The logger is configured from these very variables, so it does not exist
    // yet. console.error is the only option at this point.
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }

  return parsed.data;
}

export const env: Env = loadEnv();
export const isProduction: boolean = env.NODE_ENV === 'production';
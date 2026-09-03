import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * Load .env from the package root rather than the current working directory.
 *
 * `dotenv/config` resolves relative to process.cwd(), so a script started from
 * the repository root would silently see no configuration at all. Both
 * src/config/env.ts and the compiled dist/config/env.js sit two levels below
 * apps/api, so the same relative path works in dev and in production.
 */
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envFilePath = resolve(packageRoot, '.env');

// In production the variables come from the platform environment and no .env
// file exists — that is the expected case, not an error.
if (existsSync(envFilePath)) {
  loadDotenv({ path: envFilePath, quiet: true });
}

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

  // Object storage (Cloudflare R2 or any S3-compatible endpoint). Required:
  // the files module signs URLs at request time, and a missing key would only
  // surface as a 500 on the first upload instead of at startup.
  S3_ENDPOINT: z.string().url('S3_ENDPOINT must be a URL'),
  S3_REGION: z.string().min(1).default('auto'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
  S3_ACCESS_KEY_ID: z.string().min(1, 'S3_ACCESS_KEY_ID is required'),
  S3_SECRET_ACCESS_KEY: z.string().min(1, 'S3_SECRET_ACCESS_KEY is required'),
  // Signed URL lifetime, seconds. SRS 20.2 sets the default at 10 minutes.
  S3_SIGNED_URL_TTL_SEC: z.coerce.number().int().positive().default(600),
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
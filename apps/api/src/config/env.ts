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
 * Optional string env var where an explicitly empty value ("" in .env) means
 * "not set", same as leaving the key out entirely. Plain z.string().optional()
 * would instead treat "" as a set-but-blank value and reject it below the
 * min(1) floor.
 */
const optionalNonEmpty = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

/**
 * Only variables the API actually reads are listed here. Storage and video
 * keys join this schema in the modules that consume them — validating a
 * variable nobody uses yet would block startup for no reason. Payment keys
 * are read by the payments module (checkout and the LiqPay webhook).
 */
const envSchema = z
  .object({
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

    // Google OAuth 2.0. All three values are configured together. They stay
    // optional so CI/local environments without OAuth credentials can boot;
    // the Google endpoints answer 503 until the trio is configured.
    GOOGLE_CLIENT_ID: optionalNonEmpty,
    GOOGLE_CLIENT_SECRET: optionalNonEmpty,
    GOOGLE_REDIRECT_URI: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().url('GOOGLE_REDIRECT_URI must be a URL').optional(),
    ),

    // Comma-separated list of allowed browser origins.
    CORS_ORIGINS: z.string().default('http://localhost:5173'),

    // Public base URL of the web client, used for links that must open in the browser.
    WEB_APP_URL: z.string().url('WEB_APP_URL must be a URL').default('http://localhost:5173'),

    // Brevo transactional email. The API key is intentionally optional so local
    // development and tests keep the log-only transport. Production supplies it.
    // The README's .env template ships BREVO_API_KEY="" — optionalNonEmpty treats
    // that as unset instead of failing the min(1) check and blocking startup.
    BREVO_API_KEY: optionalNonEmpty,
    MAIL_FROM_EMAIL: z.string().email().default('noreply@example.com'),
    MAIL_FROM_NAME: z.string().min(1).default('Vexa'),
    SUPPORT_EMAIL: z.string().email().default('support@example.com'),

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

    // LiqPay sandbox only — see the payments module. Both keys come from LiqPay.
    LIQPAY_PUBLIC_KEY: z.string().min(1),
    LIQPAY_PRIVATE_KEY: z.string().min(1),
    // Public address of this API's webhook endpoint, handed to LiqPay so it can
    // call back with the payment result.
    PAYMENT_WEBHOOK_URL: z.string().url(),
    // Default platform commission, basis points (1500 = 15.00%). An author can
    // override it via AuthorProfile.commissionRateBps.
    PLATFORM_COMMISSION_BPS: z.coerce.number().int().min(0).max(10_000).default(1500),
    // Minimum author payout, in integer kopiykas. Empty in .env.example means
    // use the product default (50000 = 500.00 UAH).
    PAYOUT_MIN_AMOUNT: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.coerce.number().int().positive().default(50_000),
    ),

    // Cloudflare Stream API (direct uploads and video status). Both or neither;
    // without them the API starts and video upload answers 503.
    CF_STREAM_ACCOUNT_ID: optionalNonEmpty,
    CF_STREAM_API_TOKEN: optionalNonEmpty,

    // Cloudflare Stream signed playback (SRS 20.2, apps/api/src/lib/stream.ts).
    // Optional: most environments run without video signing configured, and the
    // player then falls back to video.status = "UNAVAILABLE" instead of failing.
    CF_STREAM_CUSTOMER_CODE: optionalNonEmpty,
    CF_STREAM_SIGNING_KEY_ID: optionalNonEmpty,
    // Base64 of the signing key's PEM, exactly as Cloudflare returns it.
    CF_STREAM_SIGNING_KEY_PEM: optionalNonEmpty,
    // Base signed-URL TTL, seconds; the actual TTL also covers the video length
    // (see playbackTtlSec). Capped at 86_400 — Cloudflare's own limit on `exp`.
    STREAM_SIGNED_URL_TTL_SEC: z.coerce.number().int().positive().max(86_400).default(600),
  })
  .superRefine((value, ctx) => {
    const googleKeys = [value.GOOGLE_CLIENT_ID, value.GOOGLE_CLIENT_SECRET, value.GOOGLE_REDIRECT_URI];
    const googleSetCount = googleKeys.filter((key) => key !== undefined).length;

    if (googleSetCount !== 0 && googleSetCount !== googleKeys.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_CLIENT_ID'],
        message: 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI must be set together',
      });
    }

    const streamKeys = [
      value.CF_STREAM_CUSTOMER_CODE,
      value.CF_STREAM_SIGNING_KEY_ID,
      value.CF_STREAM_SIGNING_KEY_PEM,
    ];
    const setCount = streamKeys.filter((key) => key !== undefined).length;

    // All-or-nothing: a partially configured signing key would sign tokens
    // Cloudflare rejects, which is worse than the documented "not configured"
    // fallback and would only surface once a student tries to play a video.
    if (setCount !== 0 && setCount !== streamKeys.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['CF_STREAM_CUSTOMER_CODE'],
        message: 'CF_STREAM_CUSTOMER_CODE, CF_STREAM_SIGNING_KEY_ID and CF_STREAM_SIGNING_KEY_PEM must be set together',
      });
    }

    // Same reasoning: an account id without a token (or the reverse) can only
    // fail at the first upload, so reject it at startup.
    if ((value.CF_STREAM_ACCOUNT_ID === undefined) !== (value.CF_STREAM_API_TOKEN === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['CF_STREAM_ACCOUNT_ID'],
        message: 'CF_STREAM_ACCOUNT_ID and CF_STREAM_API_TOKEN must be set together',
      });
    }
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
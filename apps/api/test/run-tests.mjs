import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(apiRoot, '../..');
/**
 * npm's own CLI script, run through the current Node binary instead of the
 * `npm` / `npm.cmd` shim. On Windows Node refuses to spawn `.cmd` files
 * without a shell (CVE-2024-27980), and a shell would concatenate arguments
 * unescaped. npm sets `npm_execpath` for every `npm run` script.
 */
const npmCli = process.env.npm_execpath;

if (npmCli === undefined || npmCli.length === 0) {
  console.error('Run the suite through npm: `npm run test`.');
  process.exit(1);
}

/**
 * A dedicated database rather than a schema inside the dev one: pg_trgm is
 * installed once per database, into whichever schema created it first, and
 * its `gin_trgm_ops` operator class is invisible from any other schema.
 * Same layout as CI. Prisma creates the database if it does not exist.
 */
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://vexa:vexa@localhost:5433/vexa_test?schema=public';
const redisUrl = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15';

/**
 * Integration tests reset their database before the suite. Refuse to run when
 * the target does not look explicitly test-only, so a typo can never wipe the
 * developer's normal `public` schema.
 */
function assertTestDatabase(urlString) {
  const url = new URL(urlString);
  const databaseName = url.pathname.replace(/^\//, '').toLowerCase();
  const schemaName = (url.searchParams.get('schema') ?? '').toLowerCase();

  if (!databaseName.includes('test') && !schemaName.includes('test')) {
    console.error(
      'Refusing to reset DATABASE_URL because neither the database nor schema contains "test".',
    );
    process.exit(1);
  }
}

assertTestDatabase(databaseUrl);

const testEnv = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  REDIS_URL: redisUrl,
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-at-least-thirty-two-characters',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-at-least-thirty-two-characters',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? '30d',
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:5173',
  WEB_APP_URL: process.env.WEB_APP_URL ?? 'http://localhost:5173',
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  S3_REGION: process.env.S3_REGION ?? 'us-east-1',
  S3_BUCKET: process.env.S3_BUCKET ?? 'vexa-test',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? 'test-access-key',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? 'test-secret-key',
  S3_SIGNED_URL_TTL_SEC: process.env.S3_SIGNED_URL_TTL_SEC ?? '600',
  LIQPAY_PUBLIC_KEY: process.env.LIQPAY_PUBLIC_KEY ?? 'sandbox_test_public_key',
  LIQPAY_PRIVATE_KEY: process.env.LIQPAY_PRIVATE_KEY ?? 'sandbox_test_private_key',
  PAYMENT_WEBHOOK_URL: process.env.PAYMENT_WEBHOOK_URL ?? 'http://localhost:3000/api/payments/webhook',
  PLATFORM_COMMISSION_BPS: process.env.PLATFORM_COMMISSION_BPS ?? '1500',
};

function run(args, cwd = apiRoot) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd,
    env: testEnv,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// @vexa/shared is a workspace package whose package.json points to dist/.
// A fresh CI checkout has no dist directory yet, and GitHub Actions jobs do
// not share the output of the separate build job. Build the shared package
// here so integration tests can resolve imports such as auth schemas/routes.
run(['run', 'build', '--workspace', '@vexa/shared'], repoRoot);

// Recreate only the dedicated test database/schema by applying the real
// migrations. The init migration enables pg_trgm before Prisma creates the
// GIN trigram index, which `prisma db push --force-reset` cannot do because
// db push does not execute migration SQL. This never touches the developer
// database/schema because of assertTestDatabase above.
run([
  'exec',
  'prisma',
  '--',
  'migrate',
  'reset',
  '--force',
  '--skip-seed',
  '--skip-generate',
]);
run(['exec', 'vitest', '--', 'run', '--config', 'vitest.config.ts']);

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../../..');

const baseUrlRaw = process.env.LOAD_BASE_URL;
const courseIdOrSlug = process.env.LOAD_COURSE_ID_OR_SLUG;
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 100);
const allowNonStaging = process.env.LOAD_ALLOW_NON_STAGING === '1';

if (baseUrlRaw === undefined || baseUrlRaw.length === 0) {
  console.error('LOAD_BASE_URL is required, e.g. https://api-staging.example.com');
  process.exit(1);
}

if (courseIdOrSlug === undefined || courseIdOrSlug.length === 0) {
  console.error('LOAD_COURSE_ID_OR_SLUG is required and must point to a published course.');
  process.exit(1);
}

if (!Number.isInteger(concurrency) || concurrency <= 0 || concurrency > 1000) {
  console.error('LOAD_CONCURRENCY must be an integer in the range 1..1000.');
  process.exit(1);
}

const baseUrl = new URL(baseUrlRaw);
const hostLooksStaging = /(^|[.-])(staging|stage|preview|test)([.-]|$)/i.test(baseUrl.hostname);
if (!hostLooksStaging && !allowNonStaging) {
  console.error(
    `Refusing to load-test ${baseUrl.hostname}: the host does not look like staging/preview. ` +
      'Set LOAD_ALLOW_NON_STAGING=1 only when you have explicitly verified the target is safe.',
  );
  process.exit(1);
}

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

function round(value) {
  return Math.round(value * 100) / 100;
}

async function hit(path) {
  const url = new URL(path, baseUrl);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    const elapsedMs = performance.now() - startedAt;
    await response.arrayBuffer();

    return {
      ok: response.ok,
      status: response.status,
      elapsedMs,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: performance.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarize(name, results) {
  const latencies = results.map((result) => result.elapsedMs).sort((a, b) => a - b);
  const errors = results.filter((result) => !result.ok);
  const statuses = {};

  for (const result of results) {
    const key = String(result.status);
    statuses[key] = (statuses[key] ?? 0) + 1;
  }

  return {
    name,
    requests: results.length,
    errors: errors.length,
    errorRatePercent: round((errors.length / results.length) * 100),
    statuses,
    latencyMs: {
      min: round(latencies[0] ?? 0),
      avg: round(latencies.reduce((sum, value) => sum + value, 0) / Math.max(latencies.length, 1)),
      p50: round(percentile(latencies, 0.5)),
      p95: round(percentile(latencies, 0.95)),
      p99: round(percentile(latencies, 0.99)),
      max: round(latencies.at(-1) ?? 0),
    },
    sampleErrors: errors.slice(0, 5).map((result) => ({
      status: result.status,
      error: result.error,
    })),
  };
}

async function runPhase(name, path) {
  console.log(`\n${name}: ${concurrency} concurrent requests -> ${path}`);
  const phaseStartedAt = performance.now();
  const results = await Promise.all(Array.from({ length: concurrency }, () => hit(path)));
  const summary = summarize(name, results);
  summary.wallClockMs = round(performance.now() - phaseStartedAt);
  console.table(summary.latencyMs);
  console.log('statuses:', summary.statuses, 'errors:', summary.errors);
  return summary;
}

const catalog = await runPhase('catalog', '/api/courses?page=1&limit=12');
const course = await runPhase('course-detail', `/api/courses/${encodeURIComponent(courseIdOrSlug)}`);

const report = {
  generatedAt: new Date().toISOString(),
  target: baseUrl.origin,
  concurrency,
  tool: 'Node.js built-in fetch',
  phases: [catalog, course],
};

const reportPath = resolve(repoRoot, 'docs/load-test-results.json');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`\nReport written to ${reportPath}`);

if (catalog.errors > 0 || course.errors > 0) {
  console.error('Load test failed: at least one request returned an error.');
  process.exit(1);
}

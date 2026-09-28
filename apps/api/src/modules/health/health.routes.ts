/**
 * Health endpoints.
 *
 * GET /health is a readiness probe: it checks the two dependencies the API
 * cannot work without, so a deploy that starts but cannot reach Postgres is
 * visible immediately rather than on the first user request.
 *
 * GET /health/live is a liveness probe for the container platform: it never
 * touches Postgres or Redis, so a slow or temporarily unreachable dependency
 * cannot be mistaken for a crashed process and trigger a restart loop.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router, type Request, type Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';

const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../package.json');
const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version: string };

export const healthRouter: Router = Router();

healthRouter.get('/health', async (_req: Request, res: Response): Promise<void> => {
  const [database, cache] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);

  const databaseUp = database.status === 'fulfilled';
  const cacheUp = cache.status === 'fulfilled';
  const healthy = databaseUp && cacheUp;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    dependencies: {
      database: databaseUp ? 'up' : 'down',
      cache: cacheUp ? 'up' : 'down',
    },
  });
});

healthRouter.get('/health/live', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    version,
  });
});
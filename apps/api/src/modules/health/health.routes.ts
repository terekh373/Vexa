/**
 * Liveness/readiness probe. Checks the two dependencies the API cannot work
 * without, so a deploy that starts but cannot reach Postgres is visible
 * immediately rather than on the first user request.
 */
import { Router, type Request, type Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';

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
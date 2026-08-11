/**
 * Express application assembly. Kept separate from index.ts so integration
 * tests can build an app without binding a port.
 */
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { AppError } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';

function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function createApp(): Express {
  const app = express();

  // Behind Vercel/Railway proxies: makes req.ip the real client address,
  // which the rate limiter depends on to key its counters correctly.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: parseOrigins(env.CORS_ORIGINS), credentials: true }));

  // 1mb is plenty for JSON: file uploads go to S3 via signed URLs, never
  // through this body parser.
  app.use(express.json({ limit: '1mb' }));

  app.use(pinoHttp({ logger }));

  // Baseline limit for the whole API. Auth endpoints get a much stricter
  // limiter of their own in the login/register commit.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  app.use('/api', healthRouter);

  // 404 fallback. Express 5 rejects the old `app.all('*')` form — a bare
  // app.use() after all routes is the supported equivalent.
  app.use((_req, _res, next) => {
    next(AppError.notFound('Route not found'));
  });

  app.use(errorHandler);

  return app;
}
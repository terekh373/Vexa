/**
 * Redis client singleton. Used for refresh-token allowlists, email
 * verification tokens and, later, catalog caching.
 */
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const redis = new Redis(env.REDIS_URL);

// ioredis reconnects on its own; an unhandled 'error' event would crash
// the process on a transient network blip.
redis.on('error', (error: Error) => {
  logger.error({ err: error }, 'Redis connection error');
});
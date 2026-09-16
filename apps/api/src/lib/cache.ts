/**
 * Read-through cache on top of Redis.
 *
 * Fail-open by design: a Redis outage (read or write) must never turn into a
 * 500 for the caller, so every Redis error is logged and swallowed, falling
 * back to `loader`. A cached value that fails to parse is treated the same
 * way as a cache miss.
 */
import { logger } from './logger.js';
import { redis } from './redis.js';

export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await redis.get(key);

    if (cached !== null) {
      try {
        const parsed: T = JSON.parse(cached);
        return parsed;
      } catch (error) {
        logger.warn({ err: error, key }, 'Cache entry is not valid JSON, treating as a miss');
      }
    }
  } catch (error) {
    logger.warn({ err: error, key }, 'Redis read failed, falling back to the loader');
  }

  const value = await loader();

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    logger.warn({ err: error, key }, 'Redis write failed, skipping cache');
  }

  return value;
}

/** Drops a cache entry so the next read repopulates it from the loader. */
export async function invalidateCached(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    logger.warn({ err: error, key }, 'Redis delete failed, cache entry may be stale until it expires');
  }
}

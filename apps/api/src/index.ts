/**
 * Process entry point: start the HTTP server and shut it down cleanly.
 */
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API server started');
});

let shuttingDown = false;

/**
 * Stop accepting new connections, let in-flight requests finish, then release
 * the database and cache handles. Without this a redeploy can cut a request
 * mid-transaction and leak pool connections.
 */
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutdown started');

  // Hard stop if a hung connection refuses to close.
  const forceExit = setTimeout(() => {
    logger.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  await new Promise<void>((resolve) => {
    server.close(() => {
      resolve();
    });
  });

  await prisma.$disconnect();
  await redis.quit();

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', (signal) => void shutdown(signal));
process.on('SIGINT', (signal) => void shutdown(signal));

// A rejected promise nobody awaited leaves the process in an unknown state.
// Log loudly and stop rather than keep serving traffic.
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

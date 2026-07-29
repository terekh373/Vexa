import './env.js';
import { createApp } from './app.js';
import { prisma } from './prisma.js';

const parsePort = (): number => {
  const rawPort = process.env.PORT ?? '3000';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }
  return port;
};

const port = parsePort();
const app = createApp();

app.listen(port, () => {
  console.log(`Vexa API is listening on http://localhost:${port}`);
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  console.log(`Received ${signal}, shutting down...`);
  app.close(async (serverError) => {
    await prisma.$disconnect();
    if (serverError) {
      console.error('Failed to stop HTTP server:', serverError);
      process.exitCode = 1;
      return;
    }
    process.exitCode = 0;
  });
};

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

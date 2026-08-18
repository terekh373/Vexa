/**
 * Prisma client singleton.
 *
 * One instance per process: PrismaClient owns a connection pool, and creating
 * it per request exhausts Postgres connections within minutes.
 */
import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env.js';

export const prisma = new PrismaClient({
  log: isProduction ? ['error'] : ['warn', 'error'],
});

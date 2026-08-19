/**
 * Role gate implementing the access matrix from section 14.1 of the SRS.
 *
 * Always mounted after `authenticate`: a missing req.auth here means the route
 * was wired wrong, and failing closed with 401 is the safe reading.
 */
import type { UserRole } from '@prisma/client';
import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

/**
 * Passes when the user holds at least one of the listed roles.
 *
 * `users.roles` is an array: one account can be both a student and an author
 * (SRS 15.1), so this is an intersection test, not an equality check.
 */
export function requireRoles(...allowed: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (req.auth === undefined) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }

    const permitted = req.auth.roles.some((role) => allowed.includes(role));

    if (!permitted) {
      // 403, not 401: the identity is known, the permissions are not enough.
      // Answering 401 here would send the client into a refresh loop.
      next(AppError.forbidden('Insufficient permissions'));
      return;
    }

    next();
  };
}
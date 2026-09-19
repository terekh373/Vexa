/**
 * Bearer token authentication.
 *
 * Populates req.auth on success. Answers 401 — never 403 — because at this
 * point the caller's identity is unknown: the client must refresh or sign in,
 * not give up.
 */
import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';

const BEARER_PREFIX = 'Bearer ';

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.get('authorization');

  if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
    next(AppError.unauthorized('Authentication required'));
    return;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  if (token.length === 0) {
    next(AppError.unauthorized('Authentication required'));
    return;
  }

  try {
    // Throws AppError.unauthorized on a bad signature, expiry or audience.
    const payload = verifyAccessToken(token);

    req.auth = { userId: payload.sub, roles: payload.roles };
    next();
  } catch (error) {
    next(error);
  }
};
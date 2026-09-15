import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/lib/errors.js';
import { requireRoles } from '../../src/middleware/requireRoles.js';

function runMiddleware(req: Partial<Request>, roles: Parameters<typeof requireRoles>) {
  const next = vi.fn<(error?: unknown) => void>();
  const middleware = requireRoles(...roles);

  middleware(req as Request, {} as Response, next as NextFunction);

  return next;
}

describe('requireRoles', () => {
  it('passes when user roles intersect with allowed roles', () => {
    const next = runMiddleware(
      { auth: { userId: 'user-1', roles: ['STUDENT', 'AUTHOR'] } },
      ['AUTHOR', 'ADMIN'],
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 401 when req.auth is missing', () => {
    const next = runMiddleware({}, ['AUTHOR']);
    const error = next.mock.calls[0]?.[0];

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(401);
  });

  it('returns 403 when the authenticated user lacks every allowed role', () => {
    const next = runMiddleware(
      { auth: { userId: 'user-1', roles: ['STUDENT'] } },
      ['AUTHOR', 'ADMIN'],
    );
    const error = next.mock.calls[0]?.[0];

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(403);
  });
});

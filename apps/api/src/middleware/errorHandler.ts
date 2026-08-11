/**
 * Terminal error middleware. Must be registered last: Express routes an error
 * to the first middleware declared with four parameters.
 */
import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env.js';
import { AppError, type ErrorCode, type ErrorDetail } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}

/** Flattens a ZodError into the field/message pairs a form UI can consume. */
function toErrorDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const body: ErrorResponseBody = {
      error: { code: err.code, message: err.message },
    };
    if (err.details) {
      body.error.details = err.details;
    }
    res.status(err.status).json(body);
    return;
  }

  // A ZodError arriving here means a schema ran outside the validate
  // middleware. Still answer 400 rather than 500 — the input is at fault.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: toErrorDetails(err),
      },
    } satisfies ErrorResponseBody);
    return;
  }

  // P2002 = unique constraint violation. Reached when a race slips past an
  // application-level check, e.g. two simultaneous sign-ups for one email.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'Resource already exists' },
    } satisfies ErrorResponseBody);
    return;
  }

  // Anything below is an unhandled bug: log it in full, expose nothing.
  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Internal server error' : String(err),
    },
  } satisfies ErrorResponseBody);
};
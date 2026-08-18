/**
 * Application error type.
 *
 * Every *expected* failure (bad input, missing entity, insufficient role) is
 * thrown as an AppError. Anything else reaching the error middleware is by
 * definition a bug and becomes a 500 with no details exposed to the client.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR';

/** Field-level validation problem, shaped for direct use by form UIs. */
export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: ErrorDetail[] | undefined;

  constructor(status: number, code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, AppError);
  }

  static validation(message: string, details?: ErrorDetail[]): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  /** No credentials, or credentials that do not identify a user. */
  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  /** Identity is known, but the role is not sufficient. */
  static forbidden(message = 'Insufficient permissions'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }
}
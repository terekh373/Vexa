/**
 * Application logger.
 *
 * `redact` is a security control, not cosmetics: without it an authorization
 * header or a password field ends up in plain text in the log storage.
 */
import pino from 'pino';
import { isProduction } from '../config/env.js';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.refreshToken',
      '*.accessToken',
    ],
    censor: '[redacted]',
  },
});
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { logger } from './logger.js';

interface ErrorLike {
  name: string;
  message: string;
  stack?: string;
}

function normalizeError(error: unknown): ErrorLike {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || String(error),
      stack: error.stack,
    };
  }

  return {
    name: 'NonErrorThrown',
    message: typeof error === 'string' ? error : (JSON.stringify(error) ?? String(error)),
  };
}

function sentryEnvelopeUrl(dsnString: string): string {
  const dsn = new URL(dsnString);
  const projectId = dsn.pathname.split('/').filter(Boolean).at(-1);

  if (projectId === undefined || dsn.username.length === 0) {
    throw new Error('Invalid Sentry DSN');
  }

  const endpoint = new URL(`/api/${projectId}/envelope/`, `${dsn.protocol}//${dsn.host}`);
  endpoint.searchParams.set('sentry_version', '7');
  endpoint.searchParams.set('sentry_key', dsn.username);
  endpoint.searchParams.set('sentry_client', 'vexa-api/1.0');
  return endpoint.toString();
}

function makeEnvelope(error: unknown, request: Request, statusCode: number): string {
  const normalized = normalizeError(error);
  const eventId = randomUUID().replaceAll('-', '');
  const sentAt = new Date().toISOString();

  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    sent_at: sentAt,
    dsn: env.SENTRY_DSN,
  });
  const itemHeader = JSON.stringify({ type: 'event' });
  const event = JSON.stringify({
    event_id: eventId,
    timestamp: sentAt,
    platform: 'node',
    level: 'error',
    environment: env.NODE_ENV,
    message: normalized.message,
    exception: {
      values: [
        {
          type: normalized.name,
          value: normalized.message,
        },
      ],
    },
    tags: {
      'http.method': request.method,
      'http.status_code': String(statusCode),
    },
    request: {
      method: request.method,
      url: request.path,
    },
    extra: normalized.stack === undefined ? undefined : { stack: normalized.stack },
  });

  return `${envelopeHeader}\n${itemHeader}\n${event}`;
}

/**
 * Report a server-side failure without delaying the API response.
 *
 * Request bodies, query strings, cookies and authorization headers are not
 * included, so passwords/tokens cannot leak into Sentry through this path.
 */
export function reportServerError(error: unknown, request: Request, statusCode: number): void {
  if (statusCode < 500 || env.SENTRY_DSN === undefined) return;

  let endpoint: string;
  try {
    endpoint = sentryEnvelopeUrl(env.SENTRY_DSN);
  } catch (dsnError) {
    logger.warn({ err: dsnError }, 'Sentry DSN is invalid; error event was not sent');
    return;
  }

  const body = makeEnvelope(error, request, statusCode);

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-sentry-envelope' },
    body,
    signal: AbortSignal.timeout(1500),
  }).catch((sendError: unknown) => {
    logger.warn({ err: sendError }, 'Failed to send error event to Sentry');
  });
}

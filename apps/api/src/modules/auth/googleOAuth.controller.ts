import type { Request, RequestHandler, Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import {
  completeGoogleCallback,
  createGoogleAuthorizationUrl,
  exchangeGoogleLoginCode,
} from './googleOAuth.service.js';
import { googleExchangeSchema } from './googleOAuth.validation.js';
import type { SessionContext } from './auth.service.js';

function readSessionContext(req: Request): SessionContext {
  const userAgent = req.get('user-agent');
  return {
    userAgent: userAgent === undefined ? null : userAgent.slice(0, 255),
    ipAddress: req.ip ?? null,
  };
}

function webCallbackUrl(params: Record<string, string>): string {
  const url = new URL('/auth/google/callback', env.WEB_APP_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function callbackErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    if (error.status === 403) return 'account_blocked';
    if (error.status === 503) return 'not_configured';
    if (error.status === 401) return 'authorization_failed';
    if (error.status === 409) return 'account_conflict';
  }
  return 'oauth_failed';
}

export const googleStartHandler: RequestHandler = async (_req: Request, res: Response) => {
  const url = await createGoogleAuthorizationUrl();
  res.redirect(302, url);
};

export const googleCallbackHandler: RequestHandler = async (req: Request, res: Response) => {
  const providerError = typeof req.query.error === 'string' ? req.query.error : null;
  if (providerError !== null) {
    res.redirect(302, webCallbackUrl({ error: providerError === 'access_denied' ? 'access_denied' : 'authorization_failed' }));
    return;
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (!code || !state) {
    res.redirect(302, webCallbackUrl({ error: 'invalid_callback' }));
    return;
  }

  try {
    const exchangeCode = await completeGoogleCallback(code, state);
    res.redirect(302, webCallbackUrl({ code: exchangeCode }));
  } catch (error) {
    logger.warn({ err: error }, 'Google OAuth callback failed');
    res.redirect(302, webCallbackUrl({ error: callbackErrorCode(error) }));
  }
};

export const googleExchangeHandler: RequestHandler = async (req: Request, res: Response) => {
  const input = googleExchangeSchema.parse(req.body);
  const result = await exchangeGoogleLoginCode(input.code, readSessionContext(req));
  res.status(200).json(result);
};

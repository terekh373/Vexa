/**
 * HTTP layer: parse input, call the service, shape the response.
 * No business rules here.
 */
import { loginSchema, registerSchema } from '@vexa/shared';
import type { Request, RequestHandler, Response } from 'express';
import { consumeVerificationToken } from './emailVerification.service.js';
import { login, register, type SessionContext } from './auth.service.js';

/** Express 5 forwards a rejected promise to the error middleware on its own. */

function readSessionContext(req: Request): SessionContext {
  const userAgent = req.get('user-agent');

  return {
    // varchar(255) in refresh_tokens — truncate rather than fail the insert.
    userAgent: userAgent === undefined ? null : userAgent.slice(0, 255),
    ipAddress: req.ip ?? null,
  };
}

export const registerHandler: RequestHandler = async (req: Request, res: Response) => {
  // Throws ZodError on bad input; errorHandler turns it into 400 + details.
  const input = registerSchema.parse(req.body);
  const result = await register(input, readSessionContext(req));

  res.status(201).json(result);
};

export const loginHandler: RequestHandler = async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await login(input, readSessionContext(req));

  res.status(200).json(result);
};

export const verifyEmailHandler: RequestHandler = async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  await consumeVerificationToken(token);

  res.status(200).json({ status: 'verified' });
};
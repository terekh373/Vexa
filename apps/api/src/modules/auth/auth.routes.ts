/**
 * Auth routes.
 *
 * These endpoints get their own limiter: the global 300/min is meant for
 * catalog browsing and is far too generous for credential guessing.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginHandler, registerHandler, verifyEmailHandler } from './auth.controller.js';

export const authRouter: Router = Router();

const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Successful sign-ins should not count toward the limit: a shared office IP
  // would otherwise lock out honest users.
  skipSuccessfulRequests: true,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try again later' } },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try again later' } },
});

authRouter.post('/register', registrationLimiter, registerHandler);
authRouter.post('/login', credentialsLimiter, loginHandler);
authRouter.get('/verify-email', verifyEmailHandler);
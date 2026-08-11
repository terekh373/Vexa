/**
 * Auth routes.
 *
 * These endpoints get their own limiter: the global 300/min is meant for
 * catalog browsing and is far too generous for credential guessing.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  loginHandler,
  logoutAllHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  verifyEmailHandler,
  meHandler,
} from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

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

/**
 * Refresh is a credential endpoint, but a legitimate client hits it every
 * 15 minutes across several tabs and devices — hence a far looser cap than
 * on login.
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try again later' } },
});

authRouter.post('/refresh', refreshLimiter, refreshHandler);
authRouter.post('/logout', logoutHandler);
authRouter.post('/logout-all', logoutAllHandler);

authRouter.post('/register', registrationLimiter, registerHandler);
authRouter.post('/login', credentialsLimiter, loginHandler);
authRouter.get('/verify-email', verifyEmailHandler);

authRouter.get('/me', authenticate, meHandler);
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate.js';
import {
  activateAuthorProfileHandler,
  changePasswordHandler,
  updateAuthorProfileHandler,
  updateMeHandler,
} from './me.controller.js';

export const meRouter: Router = Router();

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many attempts, try again later',
    },
  },
});

meRouter.use(authenticate);
meRouter.patch('/', updateMeHandler);
meRouter.post('/password', passwordChangeLimiter, changePasswordHandler);
meRouter.post('/author-profile', activateAuthorProfileHandler);
meRouter.patch('/author-profile', updateAuthorProfileHandler);

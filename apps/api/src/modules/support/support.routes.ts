import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supportContactHandler } from './support.controller.js';

export const supportRouter: Router = Router();

const supportContactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many support requests, try again later',
    },
  },
});

supportRouter.post('/contact', supportContactLimiter, supportContactHandler);

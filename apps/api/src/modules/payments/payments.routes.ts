import express, { Router } from 'express';
import { liqpayWebhookHandler } from './payments.controller.js';

export const paymentsRouter: Router = Router();

// The provider posts form-urlencoded data, not JSON, and only this route
// needs it — the global express.json() middleware ignores this content type.
paymentsRouter.post(
  '/webhook',
  express.urlencoded({ extended: false, limit: '64kb' }),
  liqpayWebhookHandler,
);

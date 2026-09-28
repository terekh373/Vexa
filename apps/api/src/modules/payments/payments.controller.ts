import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import { orderIdParamsSchema } from '../orders/orders.validation.js';
import { handleLiqpayWebhook, startCheckout } from './payments.service.js';

function userIdFrom(req: Request): string {
  if (req.auth === undefined) throw AppError.unauthorized('Authentication required');
  return req.auth.userId;
}

export const startCheckoutHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = orderIdParamsSchema.parse(req.params);
  const result = await startCheckout(userIdFrom(req), id);
  res.status(200).json(result);
};

// No authentication: LiqPay itself calls this route.
export const liqpayWebhookHandler: RequestHandler = async (req: Request, res: Response) => {
  await handleLiqpayWebhook(req.body);
  res.status(200).json({ status: 'ok' });
};

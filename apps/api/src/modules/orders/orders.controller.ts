import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import { createOrder, getMyOrder, listMyOrders } from './orders.service.js';
import { myOrdersQuerySchema, orderIdParamsSchema } from './orders.validation.js';

function userIdFrom(req: Request): string {
  if (req.auth === undefined) throw AppError.unauthorized('Authentication required');
  return req.auth.userId;
}

export const createOrderHandler: RequestHandler = async (req: Request, res: Response) => {
  const order = await createOrder(userIdFrom(req));
  res.status(201).json(order);
};

export const listMyOrdersHandler: RequestHandler = async (req: Request, res: Response) => {
  const query = myOrdersQuerySchema.parse(req.query);
  const result = await listMyOrders(userIdFrom(req), query);
  res.status(200).json(result);
};

export const getMyOrderHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = orderIdParamsSchema.parse(req.params);
  const order = await getMyOrder(userIdFrom(req), id);
  res.status(200).json(order);
};

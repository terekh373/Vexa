import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import { addItem, getCart, removeItem } from './cart.service.js';
import { addCartItemSchema, cartCourseParamsSchema } from './cart.validation.js';

function userIdFrom(req: Request): string {
  if (req.auth === undefined) throw AppError.unauthorized('Authentication required');
  return req.auth.userId;
}

export const getCartHandler: RequestHandler = async (req: Request, res: Response) => {
  const cart = await getCart(userIdFrom(req));
  res.status(200).json(cart);
};

export const addCartItemHandler: RequestHandler = async (req: Request, res: Response) => {
  const input = addCartItemSchema.parse(req.body);
  const cart = await addItem(userIdFrom(req), input.courseId);
  res.status(200).json(cart);
};

export const removeCartItemHandler: RequestHandler = async (req: Request, res: Response) => {
  const { courseId } = cartCourseParamsSchema.parse(req.params);
  const cart = await removeItem(userIdFrom(req), courseId);
  res.status(200).json(cart);
};

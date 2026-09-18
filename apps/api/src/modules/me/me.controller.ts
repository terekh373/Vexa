import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import { changePassword, updateMe } from './me.service.js';
import { changePasswordSchema, updateMeSchema } from './me.validation.js';

function requireCurrentUserId(req: Request): string {
  if (req.auth === undefined) {
    throw AppError.unauthorized('Authentication required');
  }

  return req.auth.userId;
}

export const updateMeHandler: RequestHandler = async (req: Request, res: Response) => {
  const input = updateMeSchema.parse(req.body);
  const result = await updateMe(requireCurrentUserId(req), input);

  res.status(200).json(result);
};

export const changePasswordHandler: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  const input = changePasswordSchema.parse(req.body);
  await changePassword(requireCurrentUserId(req), input);

  res.status(204).send();
};

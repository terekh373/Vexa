import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import type { SessionContext } from '../auth/auth.service.js';
import {
  activateAuthorProfile,
  changePassword,
  updateAuthorProfile,
  updateMe,
} from './me.service.js';
import {
  authorProfileCreateSchema,
  authorProfileUpdateSchema,
  changePasswordSchema,
  updateMeSchema,
} from './me.validation.js';

function requireCurrentUserId(req: Request): string {
  if (req.auth === undefined) {
    throw AppError.unauthorized('Authentication required');
  }

  return req.auth.userId;
}

function readSessionContext(req: Request): SessionContext {
  const userAgent = req.get('user-agent');

  return {
    userAgent: userAgent === undefined ? null : userAgent.slice(0, 255),
    ipAddress: req.ip ?? null,
  };
}

export const updateMeHandler: RequestHandler = async (req: Request, res: Response) => {
  const input = updateMeSchema.parse(req.body);
  const result = await updateMe(requireCurrentUserId(req), input);

  res.status(200).json(result);
};

export const activateAuthorProfileHandler: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  const input = authorProfileCreateSchema.parse(req.body);
  const result = await activateAuthorProfile(
    requireCurrentUserId(req),
    input,
    readSessionContext(req),
  );

  res.status(201).json(result);
};

export const updateAuthorProfileHandler: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  const input = authorProfileUpdateSchema.parse(req.body);
  const result = await updateAuthorProfile(requireCurrentUserId(req), input);

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

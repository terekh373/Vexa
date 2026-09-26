import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications.service.js';
import {
  notificationIdParamsSchema,
  notificationsQuerySchema,
} from './notifications.validation.js';

function requireCurrentUserId(req: Request): string {
  if (req.auth === undefined) throw AppError.unauthorized('Authentication required');
  return req.auth.userId;
}

export const listNotificationsHandler: RequestHandler = async (req: Request, res: Response) => {
  const query = notificationsQuerySchema.parse(req.query);
  const result = await listNotifications(requireCurrentUserId(req), query);
  res.status(200).json(result);
};

export const markNotificationReadHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = notificationIdParamsSchema.parse(req.params);
  await markNotificationRead(requireCurrentUserId(req), id);
  res.status(204).send();
};

export const markAllNotificationsReadHandler: RequestHandler = async (req: Request, res: Response) => {
  const result = await markAllNotificationsRead(requireCurrentUserId(req));
  res.status(200).json(result);
};

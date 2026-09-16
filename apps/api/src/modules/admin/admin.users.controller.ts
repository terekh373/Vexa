import type { RequestHandler } from 'express';
import { updateUserStatus, verifyAuthor } from './admin.users.service.js';
import { updateUserStatusSchema, userIdParamsSchema, verifyAuthorSchema } from './admin.users.validation.js';

export const updateUserStatusHandler: RequestHandler = async (req, res) => {
  const { id } = userIdParamsSchema.parse(req.params);
  const input = updateUserStatusSchema.parse(req.body);
  const user = await updateUserStatus(id, input);
  res.status(200).json(user);
};

export const verifyAuthorHandler: RequestHandler = async (req, res) => {
  const { id } = userIdParamsSchema.parse(req.params);
  const input = verifyAuthorSchema.parse(req.body);
  const profile = await verifyAuthor(id, input);
  res.status(200).json(profile);
};

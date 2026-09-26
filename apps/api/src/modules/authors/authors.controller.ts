import type { Request, RequestHandler, Response } from 'express';
import { getPublicAuthorProfile } from './authors.service.js';
import { authorIdParamsSchema } from './authors.validation.js';

export const getPublicAuthorProfileHandler: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  const { id } = authorIdParamsSchema.parse(req.params);
  const profile = await getPublicAuthorProfile(id);

  res.status(200).json(profile);
};

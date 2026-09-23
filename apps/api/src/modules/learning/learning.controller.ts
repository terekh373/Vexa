import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import { getLessonForLearner, type LearnerActor } from './learning.service.js';
import { lessonParamsSchema } from './learning.validation.js';

function actorFrom(req: Request): LearnerActor {
  if (req.auth === undefined) throw AppError.unauthorized('Authentication required');
  return req.auth;
}

export const getLessonHandler: RequestHandler = async (req: Request, res: Response) => {
  const actor = actorFrom(req);
  const { lessonId } = lessonParamsSchema.parse(req.params);

  const result = await getLessonForLearner(actor, lessonId);
  res.status(200).json(result);
};

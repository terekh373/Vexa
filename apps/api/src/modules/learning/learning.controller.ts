import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import {
  completeLesson,
  enrollInFreeCourse,
  getCourseProgram,
  getLessonForLearner,
  listMyEnrollments,
  submitQuizAttempt,
  type LearnerActor,
} from './learning.service.js';
import {
  courseParamsSchema,
  lessonParamsSchema,
  myEnrollmentsQuerySchema,
  quizAttemptBodySchema,
  quizParamsSchema,
} from './learning.validation.js';

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

export const listMyEnrollmentsHandler: RequestHandler = async (req: Request, res: Response) => {
  const actor = actorFrom(req);
  const query = myEnrollmentsQuerySchema.parse(req.query);

  const result = await listMyEnrollments(actor.userId, query);
  res.status(200).json(result);
};

export const getCourseProgramHandler: RequestHandler = async (req: Request, res: Response) => {
  const actor = actorFrom(req);
  const { courseId } = courseParamsSchema.parse(req.params);

  const result = await getCourseProgram(actor, courseId);
  res.status(200).json(result);
};

export const enrollHandler: RequestHandler = async (req: Request, res: Response) => {
  const actor = actorFrom(req);
  const { courseId } = courseParamsSchema.parse(req.params);

  const result = await enrollInFreeCourse(actor, courseId);
  res.status(result.created ? 201 : 200).json(result);
};

export const completeLessonHandler: RequestHandler = async (req: Request, res: Response) => {
  const actor = actorFrom(req);
  const { lessonId } = lessonParamsSchema.parse(req.params);

  const result = await completeLesson(actor, lessonId);
  res.status(200).json(result);
};

export const submitQuizAttemptHandler: RequestHandler = async (req: Request, res: Response) => {
  const actor = actorFrom(req);
  const { quizId } = quizParamsSchema.parse(req.params);
  const body = quizAttemptBodySchema.parse(req.body);

  const result = await submitQuizAttempt(actor, quizId, body);
  res.status(201).json(result);
};

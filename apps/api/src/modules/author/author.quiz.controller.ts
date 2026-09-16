import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import {
  createQuestionSchema,
  createQuizSchema,
  questionIdParamsSchema,
  quizIdParamsSchema,
  updateQuestionSchema,
  updateQuizSchema,
} from './author.quiz.validation.js';
import {
  createAuthorQuestion,
  createAuthorQuiz,
  deleteAuthorQuestion,
  deleteAuthorQuiz,
  updateAuthorQuestion,
  updateAuthorQuiz,
} from './author.quiz.service.js';
import { lessonIdParamsSchema } from './author.validation.js';

function userIdFrom(req: Request): string {
  if (req.auth === undefined) throw AppError.unauthorized('Authentication required');
  return req.auth.userId;
}

export const createQuizHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = lessonIdParamsSchema.parse(req.params);
  const input = createQuizSchema.parse(req.body);
  const quiz = await createAuthorQuiz(userIdFrom(req), id, input);
  res.status(201).json(quiz);
};

export const updateQuizHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = quizIdParamsSchema.parse(req.params);
  const input = updateQuizSchema.parse(req.body);
  const quiz = await updateAuthorQuiz(userIdFrom(req), id, input);
  res.status(200).json(quiz);
};

export const deleteQuizHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = quizIdParamsSchema.parse(req.params);
  await deleteAuthorQuiz(userIdFrom(req), id);
  res.status(204).send();
};

export const createQuestionHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = quizIdParamsSchema.parse(req.params);
  const input = createQuestionSchema.parse(req.body);
  const question = await createAuthorQuestion(userIdFrom(req), id, input);
  res.status(201).json(question);
};

export const updateQuestionHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = questionIdParamsSchema.parse(req.params);
  const input = updateQuestionSchema.parse(req.body);
  const question = await updateAuthorQuestion(userIdFrom(req), id, input);
  res.status(200).json(question);
};

export const deleteQuestionHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = questionIdParamsSchema.parse(req.params);
  await deleteAuthorQuestion(userIdFrom(req), id);
  res.status(204).send();
};

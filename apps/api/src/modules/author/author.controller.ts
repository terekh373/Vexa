import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import {
  authorCourseListQuerySchema,
  courseIdParamsSchema,
  createCourseSchema,
  createLessonSchema,
  createModuleSchema,
  lessonIdParamsSchema,
  moduleIdParamsSchema,
  reorderCourseSchema,
  updateCourseSchema,
  updateLessonSchema,
  updateModuleSchema,
} from './author.validation.js';
import {
  createAuthorCourse,
  createAuthorLesson,
  createAuthorModule,
  deleteAuthorCourse,
  deleteAuthorLesson,
  deleteAuthorModule,
  getAuthorCourse,
  listAuthorCourses,
  reorderAuthorCourse,
  submitAuthorCourse,
  updateAuthorCourse,
  updateAuthorLesson,
  updateAuthorModule,
} from './author.service.js';

function userIdFrom(req: Request): string {
  if (req.auth === undefined) throw AppError.unauthorized('Authentication required');
  return req.auth.userId;
}

export const createCourseHandler: RequestHandler = async (req: Request, res: Response) => {
  const input = createCourseSchema.parse(req.body);
  const course = await createAuthorCourse(userIdFrom(req), input);
  res.status(201).json(course);
};

export const listCoursesHandler: RequestHandler = async (req: Request, res: Response) => {
  const query = authorCourseListQuerySchema.parse(req.query);
  const courses = await listAuthorCourses(userIdFrom(req), query);
  res.status(200).json({ items: courses });
};

export const getCourseHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = courseIdParamsSchema.parse(req.params);
  const course = await getAuthorCourse(userIdFrom(req), id);
  res.status(200).json(course);
};

export const updateCourseHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = courseIdParamsSchema.parse(req.params);
  const input = updateCourseSchema.parse(req.body);
  const course = await updateAuthorCourse(userIdFrom(req), id, input);
  res.status(200).json(course);
};

export const deleteCourseHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = courseIdParamsSchema.parse(req.params);
  await deleteAuthorCourse(userIdFrom(req), id);
  res.status(204).send();
};

export const createModuleHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = courseIdParamsSchema.parse(req.params);
  const input = createModuleSchema.parse(req.body);
  const module = await createAuthorModule(userIdFrom(req), id, input);
  res.status(201).json(module);
};

export const updateModuleHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = moduleIdParamsSchema.parse(req.params);
  const input = updateModuleSchema.parse(req.body);
  const module = await updateAuthorModule(userIdFrom(req), id, input);
  res.status(200).json(module);
};

export const deleteModuleHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = moduleIdParamsSchema.parse(req.params);
  await deleteAuthorModule(userIdFrom(req), id);
  res.status(204).send();
};

export const createLessonHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = moduleIdParamsSchema.parse(req.params);
  const input = createLessonSchema.parse(req.body);
  const lesson = await createAuthorLesson(userIdFrom(req), id, input);
  res.status(201).json(lesson);
};

export const updateLessonHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = lessonIdParamsSchema.parse(req.params);
  const input = updateLessonSchema.parse(req.body);
  const lesson = await updateAuthorLesson(userIdFrom(req), id, input);
  res.status(200).json(lesson);
};

export const deleteLessonHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = lessonIdParamsSchema.parse(req.params);
  await deleteAuthorLesson(userIdFrom(req), id);
  res.status(204).send();
};

export const reorderCourseHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = courseIdParamsSchema.parse(req.params);
  const input = reorderCourseSchema.parse(req.body);
  const course = await reorderAuthorCourse(userIdFrom(req), id, input);
  res.status(200).json(course);
};

export const submitCourseHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = courseIdParamsSchema.parse(req.params);
  const course = await submitAuthorCourse(userIdFrom(req), id);
  res.status(200).json(course);
};

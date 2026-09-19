import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import {
  getAdminCourse,
  listModerationQueue,
  moderateCourse,
  unpublishCourse,
} from './admin.courses.service.js';
import {
  adminCourseListQuerySchema,
  courseIdParamsSchema,
  moderateCourseSchema,
  unpublishCourseSchema,
} from './admin.courses.validation.js';

function moderatorIdFrom(req: Request): string {
  if (req.auth === undefined) throw AppError.unauthorized('Authentication required');
  return req.auth.userId;
}

export const listCoursesHandler: RequestHandler = async (req: Request, res: Response) => {
  const query = adminCourseListQuerySchema.parse(req.query);
  const result = await listModerationQueue(query);
  res.status(200).json(result);
};

export const getCourseHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = courseIdParamsSchema.parse(req.params);
  const course = await getAdminCourse(id);
  res.status(200).json(course);
};

export const moderateCourseHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = courseIdParamsSchema.parse(req.params);
  const input = moderateCourseSchema.parse(req.body);
  const course = await moderateCourse(moderatorIdFrom(req), id, input);
  res.status(200).json(course);
};

export const unpublishCourseHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = courseIdParamsSchema.parse(req.params);
  const input = unpublishCourseSchema.parse(req.body);
  const course = await unpublishCourse(moderatorIdFrom(req), id, input);
  res.status(200).json(course);
};

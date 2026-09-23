import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import {
  addCourseFileSchema,
  courseFileParamsSchema,
  materialCourseParamsSchema,
  reorderCourseFilesSchema,
  updateCourseFileSchema,
} from './author.material.validation.js';
import {
  addCourseFile,
  deleteCourseFile,
  reorderCourseFiles,
  updateCourseFile,
} from './author.material.service.js';

function userIdFrom(req: Request): string {
  if (req.auth === undefined) throw AppError.unauthorized('Authentication required');
  return req.auth.userId;
}

export const addCourseFileHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = materialCourseParamsSchema.parse(req.params);
  const input = addCourseFileSchema.parse(req.body);
  const courseFile = await addCourseFile(userIdFrom(req), id, input);
  res.status(201).json(courseFile);
};

export const reorderCourseFilesHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id } = materialCourseParamsSchema.parse(req.params);
  const input = reorderCourseFilesSchema.parse(req.body);
  const courseFiles = await reorderCourseFiles(userIdFrom(req), id, input);
  res.status(200).json(courseFiles);
};

export const updateCourseFileHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id, courseFileId } = courseFileParamsSchema.parse(req.params);
  const input = updateCourseFileSchema.parse(req.body);
  const courseFile = await updateCourseFile(userIdFrom(req), id, courseFileId, input);
  res.status(200).json(courseFile);
};

export const deleteCourseFileHandler: RequestHandler = async (req: Request, res: Response) => {
  const { id, courseFileId } = courseFileParamsSchema.parse(req.params);
  await deleteCourseFile(userIdFrom(req), id, courseFileId);
  res.status(204).send();
};

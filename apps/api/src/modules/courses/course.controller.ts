import type { RequestHandler } from 'express';

import { AppError } from '../../lib/errors.js';

import { getCatalog } from './catalog.service.js';
import { courseCatalogQuerySchema } from './catalog.validation.js';

import {
  createCourseReview,
  getCourseDetails,
  getCourseReviews,
  updateMyCourseReview,
} from './course.service.js';

import {
  courseIdOrSlugParamsSchema,
  courseIdParamsSchema,
  courseReviewsQuerySchema,
  createCourseReviewSchema,
  updateCourseReviewSchema,
} from './course.validation.js';

export const catalogController: RequestHandler = async (
  req,
  res,
) => {
  const query = courseCatalogQuerySchema.safeParse(req.query);

  if (!query.success) {
    throw AppError.validation(
      'Invalid catalog query',
      query.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  const result = await getCatalog(query.data);

  res.json(result);
};

export const courseDetailsController: RequestHandler = async (
  req,
  res,
) => {
  const params = courseIdOrSlugParamsSchema.safeParse(req.params);

  if (!params.success) {
    throw AppError.validation('Invalid course id or slug');
  }

  const userId =
    typeof res.locals.userId === 'string'
      ? res.locals.userId
      : undefined;

  const course = await getCourseDetails(
    params.data.idOrSlug,
    userId,
  );

  if (course === null) {
    throw AppError.notFound('Course not found');
  }

  res.json(course);
};

export const courseReviewsController: RequestHandler = async (
  req,
  res,
) => {
  const params = courseIdParamsSchema.safeParse(req.params);
  const query = courseReviewsQuerySchema.safeParse(req.query);

  if (!params.success) {
    throw AppError.validation('Invalid course id');
  }

  if (!query.success) {
    throw AppError.validation(
      'Invalid pagination parameters',
      query.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  const result = await getCourseReviews(
    params.data.id,
    query.data.page,
    query.data.limit,
  );

  if (result === null) {
    throw AppError.notFound('Course not found');
  }

  res.json(result);
};

export const createCourseReviewController: RequestHandler = async (
  req,
  res,
) => {
  const params = courseIdParamsSchema.parse(req.params);
  const input = createCourseReviewSchema.parse(req.body);

  if (req.auth === undefined) {
    throw AppError.unauthorized('Authentication required');
  }

  const result = await createCourseReview(
    params.id,
    req.auth.userId,
    input,
  );

  res.status(201).json(result);
};

export const updateMyCourseReviewController: RequestHandler = async (
  req,
  res,
) => {
  const params = courseIdParamsSchema.parse(req.params);
  const input = updateCourseReviewSchema.parse(req.body);

  if (req.auth === undefined) {
    throw AppError.unauthorized('Authentication required');
  }

  const result = await updateMyCourseReview(
    params.id,
    req.auth.userId,
    input,
  );

  res.status(200).json(result);
};

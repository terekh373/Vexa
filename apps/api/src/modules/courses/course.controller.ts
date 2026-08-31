import type { RequestHandler } from 'express';

import { AppError } from '../../lib/errors.js';

import { getCatalog } from './catalog.service.js';
import { courseCatalogQuerySchema } from './catalog.validation.js';

import {
  getCourseDetails,
  getCourseReviews,
} from './course.service.js';

import {
  courseIdOrSlugParamsSchema,
  courseIdParamsSchema,
  courseReviewsQuerySchema,
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
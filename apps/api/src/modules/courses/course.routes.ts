import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optional-auth.js';
import { requireRoles } from '../../middleware/requireRoles.js';

import {
  catalogController,
  courseDetailsController,
  courseReviewsController,
  createCourseReviewController,
  updateMyCourseReviewController,
} from './course.controller.js';

export const courseRouter = Router();

courseRouter.get('/', optionalAuth, catalogController);

courseRouter.get('/:id/reviews', courseReviewsController);
courseRouter.post(
  '/:id/reviews',
  authenticate,
  requireRoles(UserRole.STUDENT, UserRole.AUTHOR),
  createCourseReviewController,
);
courseRouter.patch(
  '/:id/reviews/my',
  authenticate,
  requireRoles(UserRole.STUDENT, UserRole.AUTHOR),
  updateMyCourseReviewController,
);

courseRouter.get(
  '/:idOrSlug',
  optionalAuth,
  courseDetailsController,
);

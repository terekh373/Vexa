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
  suggestController,
  updateMyCourseReviewController,
} from './course.controller.js';

export const courseRouter = Router();

courseRouter.get('/', optionalAuth, catalogController);

// Must stay above '/:id/reviews' and '/:idOrSlug': otherwise "suggest" is
// captured as a course slug.
courseRouter.get('/suggest', suggestController);

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

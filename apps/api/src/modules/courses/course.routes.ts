import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optional-auth.js';

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
courseRouter.post('/:id/reviews', authenticate, createCourseReviewController);
courseRouter.patch('/:id/reviews/my', authenticate, updateMyCourseReviewController);

courseRouter.get(
  '/:idOrSlug',
  optionalAuth,
  courseDetailsController,
);

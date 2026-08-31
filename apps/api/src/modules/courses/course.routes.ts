import { Router } from 'express';

import { optionalAuth } from '../../middleware/optional-auth.js';

import {
  catalogController,
  courseDetailsController,
  courseReviewsController,
} from './course.controller.js';

export const courseRouter = Router();

courseRouter.get('/', optionalAuth, catalogController);

courseRouter.get('/:id/reviews', courseReviewsController);

courseRouter.get(
  '/:idOrSlug',
  optionalAuth,
  courseDetailsController,
);
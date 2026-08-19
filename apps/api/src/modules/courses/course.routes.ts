import { Router } from 'express';
import { optionalAuth } from '../../middleware/optional-auth.js';
import { courseDetailsController, courseReviewsController } from './course.controller.js';

export const courseRouter = Router();

courseRouter.get('/:id/reviews', courseReviewsController);
courseRouter.get('/:id', optionalAuth, courseDetailsController);

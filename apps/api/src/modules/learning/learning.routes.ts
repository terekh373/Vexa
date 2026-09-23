import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRoles } from '../../middleware/requireRoles.js';
import { getLessonHandler } from './learning.controller.js';

export const learningRouter: Router = Router();

learningRouter.get(
  '/lessons/:lessonId',
  authenticate,
  requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN),
  getLessonHandler,
);

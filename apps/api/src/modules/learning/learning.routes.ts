import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRoles } from '../../middleware/requireRoles.js';
import { getCourseProgramHandler, getLessonHandler, listMyEnrollmentsHandler } from './learning.controller.js';

export const learningRouter: Router = Router();

learningRouter.get(
  '/lessons/:lessonId',
  authenticate,
  requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN),
  getLessonHandler,
);

learningRouter.get(
  '/courses/:courseId',
  authenticate,
  requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN),
  getCourseProgramHandler,
);

export const meEnrollmentsRouter: Router = Router();

meEnrollmentsRouter.get(
  '/',
  authenticate,
  requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN),
  listMyEnrollmentsHandler,
);

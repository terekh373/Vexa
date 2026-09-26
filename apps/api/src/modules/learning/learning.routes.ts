import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRoles } from '../../middleware/requireRoles.js';
import {
  completeLessonHandler,
  enrollHandler,
  getCourseProgramHandler,
  getLessonHandler,
  listMyEnrollmentsHandler,
  submitQuizAttemptHandler,
} from './learning.controller.js';

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

learningRouter.post(
  '/courses/:courseId/enroll',
  authenticate,
  requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN),
  enrollHandler,
);

learningRouter.post(
  '/lessons/:lessonId/complete',
  authenticate,
  requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN),
  completeLessonHandler,
);

learningRouter.post(
  '/quizzes/:quizId/attempts',
  authenticate,
  requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN),
  submitQuizAttemptHandler,
);

export const meEnrollmentsRouter: Router = Router();

meEnrollmentsRouter.get(
  '/',
  authenticate,
  requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN),
  listMyEnrollmentsHandler,
);

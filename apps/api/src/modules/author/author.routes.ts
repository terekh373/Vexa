import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRoles } from '../../middleware/requireRoles.js';
import {
  createCourseHandler,
  createLessonHandler,
  createModuleHandler,
  deleteCourseHandler,
  deleteLessonHandler,
  deleteModuleHandler,
  getCourseHandler,
  listCoursesHandler,
  reorderCourseHandler,
  submitCourseHandler,
  updateCourseHandler,
  updateLessonHandler,
  updateModuleHandler,
} from './author.controller.js';

export const authorRouter: Router = Router();

authorRouter.use(authenticate, requireRoles(UserRole.AUTHOR));

authorRouter.post('/courses', createCourseHandler);
authorRouter.get('/courses', listCoursesHandler);
authorRouter.get('/courses/:id', getCourseHandler);
authorRouter.patch('/courses/:id', updateCourseHandler);
authorRouter.delete('/courses/:id', deleteCourseHandler);

authorRouter.post('/courses/:id/modules', createModuleHandler);
authorRouter.patch('/modules/:id', updateModuleHandler);
authorRouter.delete('/modules/:id', deleteModuleHandler);

authorRouter.post('/modules/:id/lessons', createLessonHandler);
authorRouter.patch('/lessons/:id', updateLessonHandler);
authorRouter.delete('/lessons/:id', deleteLessonHandler);

authorRouter.patch('/courses/:id/reorder', reorderCourseHandler);
authorRouter.post('/courses/:id/submit', submitCourseHandler);

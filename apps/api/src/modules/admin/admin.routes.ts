import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRoles } from '../../middleware/requireRoles.js';
import {
  getCourseHandler,
  listCoursesHandler,
  moderateCourseHandler,
  unpublishCourseHandler,
} from './admin.courses.controller.js';

export const adminRouter: Router = Router();

adminRouter.use(authenticate, requireRoles(UserRole.ADMIN));

adminRouter.get('/courses', listCoursesHandler);
adminRouter.get('/courses/:id', getCourseHandler);
adminRouter.post('/courses/:id/moderate', moderateCourseHandler);
adminRouter.post('/courses/:id/unpublish', unpublishCourseHandler);

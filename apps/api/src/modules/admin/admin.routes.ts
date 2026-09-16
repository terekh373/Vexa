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
import { updateUserStatusHandler, verifyAuthorHandler } from './admin.users.controller.js';

export const adminRouter: Router = Router();

adminRouter.use(authenticate, requireRoles(UserRole.ADMIN));

adminRouter.get('/courses', listCoursesHandler);
adminRouter.get('/courses/:id', getCourseHandler);
adminRouter.post('/courses/:id/moderate', moderateCourseHandler);
adminRouter.post('/courses/:id/unpublish', unpublishCourseHandler);

adminRouter.patch('/users/:id/status', updateUserStatusHandler);
adminRouter.patch('/users/:id/verify-author', verifyAuthorHandler);

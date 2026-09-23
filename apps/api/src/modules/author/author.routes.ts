import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRoles } from '../../middleware/requireRoles.js';
import {
  addCourseFileHandler,
  deleteCourseFileHandler,
  reorderCourseFilesHandler,
  updateCourseFileHandler,
} from './author.material.controller.js';
import {
  createQuestionHandler,
  createQuizHandler,
  deleteQuestionHandler,
  deleteQuizHandler,
  updateQuestionHandler,
  updateQuizHandler,
} from './author.quiz.controller.js';
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
  unpublishCourseHandler,
  updateCourseHandler,
  updateLessonHandler,
  updateModuleHandler,
  replyToReviewHandler,
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

authorRouter.post('/courses/:id/files', addCourseFileHandler);
authorRouter.patch('/courses/:id/files/reorder', reorderCourseFilesHandler);
authorRouter.patch('/courses/:id/files/:courseFileId', updateCourseFileHandler);
authorRouter.delete('/courses/:id/files/:courseFileId', deleteCourseFileHandler);

authorRouter.post('/modules/:id/lessons', createLessonHandler);
authorRouter.patch('/lessons/:id', updateLessonHandler);
authorRouter.delete('/lessons/:id', deleteLessonHandler);

authorRouter.post('/lessons/:id/quiz', createQuizHandler);
authorRouter.patch('/quizzes/:id', updateQuizHandler);
authorRouter.delete('/quizzes/:id', deleteQuizHandler);
authorRouter.post('/quizzes/:id/questions', createQuestionHandler);
authorRouter.patch('/questions/:id', updateQuestionHandler);
authorRouter.delete('/questions/:id', deleteQuestionHandler);

authorRouter.patch('/courses/:id/reorder', reorderCourseHandler);
authorRouter.post('/courses/:id/submit', submitCourseHandler);
authorRouter.post('/courses/:id/unpublish', unpublishCourseHandler);

authorRouter.post('/reviews/:id/reply', replyToReviewHandler);

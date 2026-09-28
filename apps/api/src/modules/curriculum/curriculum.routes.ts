/**
 * Public school curriculum reference. No auth: subject navigation is needed on
 * the catalog before a user ever logs in.
 */
import { Router } from 'express';
import { curriculumTreeHandler } from './curriculum.controller.js';

export const curriculumRouter: Router = Router();

curriculumRouter.get('/', curriculumTreeHandler);

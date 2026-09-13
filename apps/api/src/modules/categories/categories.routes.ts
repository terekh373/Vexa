/**
 * Public catalog taxonomy. No auth: the category tree is needed on the
 * catalog page before a user ever logs in.
 */
import { Router } from 'express';
import { categoryTreeHandler } from './categories.controller.js';

export const categoriesRouter: Router = Router();

categoriesRouter.get('/', categoryTreeHandler);

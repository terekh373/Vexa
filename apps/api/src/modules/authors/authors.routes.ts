import { Router } from 'express';
import { getPublicAuthorProfileHandler } from './authors.controller.js';

export const authorsRouter: Router = Router();

authorsRouter.get('/:id', getPublicAuthorProfileHandler);

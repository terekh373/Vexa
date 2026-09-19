import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRoles } from '../../middleware/requireRoles.js';
import { addCartItemHandler, getCartHandler, removeCartItemHandler } from './cart.controller.js';

export const cartRouter: Router = Router();

cartRouter.use(authenticate, requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN));

cartRouter.get('/', getCartHandler);
cartRouter.post('/items', addCartItemHandler);
cartRouter.delete('/items/:courseId', removeCartItemHandler);

import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRoles } from '../../middleware/requireRoles.js';
import { createOrderHandler, getMyOrderHandler, listMyOrdersHandler } from './orders.controller.js';

export const ordersRouter: Router = Router();

ordersRouter.use(authenticate, requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN));

ordersRouter.post('/', createOrderHandler);

export const meOrdersRouter: Router = Router();

meOrdersRouter.use(authenticate, requireRoles(UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN));

meOrdersRouter.get('/', listMyOrdersHandler);
meOrdersRouter.get('/:id', getMyOrderHandler);

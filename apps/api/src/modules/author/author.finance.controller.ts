import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import {
  createAuthorPayout,
  getAuthorBalance,
  getAuthorDashboard,
  listAuthorBalanceEntries,
  listAuthorPayouts,
  listAuthorReviews,
} from './author.finance.service.js';
import {
  authorBalanceEntriesQuerySchema,
  authorDashboardQuerySchema,
  authorPayoutsQuerySchema,
  authorReviewsQuerySchema,
  createPayoutSchema,
} from './author.finance.validation.js';

function currentUserId(req: Request): string {
  if (req.auth === undefined) throw AppError.unauthorized('Authentication required');
  return req.auth.userId;
}

export const authorDashboardHandler: RequestHandler = async (req: Request, res: Response) => {
  const query = authorDashboardQuerySchema.parse(req.query);
  const dashboard = await getAuthorDashboard(currentUserId(req), query);
  res.status(200).json(dashboard);
};

export const authorBalanceHandler: RequestHandler = async (req: Request, res: Response) => {
  const balance = await getAuthorBalance(currentUserId(req));
  res.status(200).json(balance);
};

export const authorBalanceEntriesHandler: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  const query = authorBalanceEntriesQuerySchema.parse(req.query);
  const result = await listAuthorBalanceEntries(currentUserId(req), query);
  res.status(200).json(result);
};

export const createAuthorPayoutHandler: RequestHandler = async (req: Request, res: Response) => {
  const input = createPayoutSchema.parse(req.body);
  const payout = await createAuthorPayout(currentUserId(req), input);
  res.status(201).json(payout);
};

export const authorPayoutsHandler: RequestHandler = async (req: Request, res: Response) => {
  const query = authorPayoutsQuerySchema.parse(req.query);
  const result = await listAuthorPayouts(currentUserId(req), query);
  res.status(200).json(result);
};

export const authorReviewsHandler: RequestHandler = async (req: Request, res: Response) => {
  const query = authorReviewsQuerySchema.parse(req.query);
  const result = await listAuthorReviews(currentUserId(req), query);
  res.status(200).json(result);
};

import { PayoutMethod } from '@prisma/client';
import { z } from 'zod';

export const authorDashboardQuerySchema = z
  .object({
    period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
  })
  .strict();

const paginationSchema = {
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const authorBalanceEntriesQuerySchema = z.object(paginationSchema).strict();
export const authorPayoutsQuerySchema = z.object(paginationSchema).strict();
export const authorReviewsQuerySchema = z.object(paginationSchema).strict();

export const createPayoutSchema = z
  .object({
    amount: z.number().int().positive(),
    method: z.nativeEnum(PayoutMethod),
    destination: z.string().trim().min(4).max(128),
  })
  .strict()
  .superRefine((value, ctx) => {
    const normalized = value.destination.replace(/[\s-]/g, '');

    if (value.method === PayoutMethod.CARD && !/^\d{12,19}$/.test(normalized)) {
      ctx.addIssue({
        code: 'custom',
        path: ['destination'],
        message: 'Card number must contain 12 to 19 digits',
      });
    }

    if (
      value.method === PayoutMethod.IBAN &&
      !/^[A-Za-z]{2}\d{2}[A-Za-z0-9]{11,30}$/.test(normalized)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['destination'],
        message: 'IBAN has an invalid format',
      });
    }
  });

export type AuthorDashboardQuery = z.infer<typeof authorDashboardQuerySchema>;
export type AuthorBalanceEntriesQuery = z.infer<typeof authorBalanceEntriesQuerySchema>;
export type AuthorPayoutsQuery = z.infer<typeof authorPayoutsQuerySchema>;
export type AuthorReviewsQuery = z.infer<typeof authorReviewsQuerySchema>;
export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;

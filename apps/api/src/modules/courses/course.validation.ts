import { z } from 'zod';

export const courseIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const courseIdOrSlugParamsSchema = z.object({
  idOrSlug: z.string().trim().min(1).max(180),
});

export const courseReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const reviewTextSchema = z.string().trim().max(4000);

export const createCourseReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    text: reviewTextSchema.optional(),
  })
  .strict();

export const updateCourseReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    text: reviewTextSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Потрібно вказати хоча б одне поле',
  });

export type CreateCourseReviewInput = z.infer<typeof createCourseReviewSchema>;
export type UpdateCourseReviewInput = z.infer<typeof updateCourseReviewSchema>;

import { CourseStatus } from '@prisma/client';
import { z } from 'zod';

export const courseIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const adminCourseListQuerySchema = z
  .object({
    status: z.nativeEnum(CourseStatus).default(CourseStatus.MODERATION),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

const requiredComment = z
  .string({ error: 'Коментар обов’язковий' })
  .trim()
  .min(1, 'Коментар обов’язковий')
  .max(2000, 'Коментар занадто довгий (максимум 2000 символів)');

const optionalComment = z
  .string()
  .trim()
  .min(1, 'Коментар обов’язковий')
  .max(2000, 'Коментар занадто довгий (максимум 2000 символів)')
  .optional();

export const moderateCourseSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('APPROVE'), comment: optionalComment }).strict(),
  z.object({ action: z.literal('REJECT'), comment: requiredComment }).strict(),
]);

export const unpublishCourseSchema = z.object({ comment: requiredComment }).strict();

export type AdminCourseListQuery = z.infer<typeof adminCourseListQuerySchema>;
export type ModerateCourseInput = z.infer<typeof moderateCourseSchema>;
export type UnpublishCourseInput = z.infer<typeof unpublishCourseSchema>;

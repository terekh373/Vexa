import { ContentType } from '@prisma/client';
import { z } from 'zod';

export const lessonParamsSchema = z.object({ lessonId: z.string().uuid() }).strict();

export type LessonParams = z.infer<typeof lessonParamsSchema>;

export const myEnrollmentsQuerySchema = z.object({ type: z.nativeEnum(ContentType).optional() }).strict();

export type MyEnrollmentsQuery = z.infer<typeof myEnrollmentsQuerySchema>;

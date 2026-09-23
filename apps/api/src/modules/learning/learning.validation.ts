import { z } from 'zod';

export const lessonParamsSchema = z.object({ lessonId: z.string().uuid() }).strict();

export type LessonParams = z.infer<typeof lessonParamsSchema>;

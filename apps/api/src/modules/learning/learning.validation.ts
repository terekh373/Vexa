import { ContentType } from '@prisma/client';
import { z } from 'zod';

export const lessonParamsSchema = z.object({ lessonId: z.string().uuid() }).strict();

export type LessonParams = z.infer<typeof lessonParamsSchema>;

export const myEnrollmentsQuerySchema = z.object({ type: z.nativeEnum(ContentType).optional() }).strict();

export type MyEnrollmentsQuery = z.infer<typeof myEnrollmentsQuerySchema>;

export const courseParamsSchema = z.object({ courseId: z.string().uuid() }).strict();

export type CourseParams = z.infer<typeof courseParamsSchema>;

export const quizParamsSchema = z.object({ quizId: z.string().uuid() }).strict();

export type QuizParams = z.infer<typeof quizParamsSchema>;

export const quizAttemptBodySchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            questionId: z.string().uuid(),
            optionIds: z.array(z.string().uuid()).max(50),
          })
          .strict(),
      )
      .max(200),
  })
  .strict();

export type QuizAttemptBody = z.infer<typeof quizAttemptBodySchema>;

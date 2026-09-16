import { QuestionType } from '@prisma/client';
import { z } from 'zod';

const uuid = z.string().uuid();
const nonEmptyText = z.string().trim().min(1);

export const quizIdParamsSchema = z.object({ id: uuid }).strict();
export const questionIdParamsSchema = z.object({ id: uuid }).strict();

export const createQuizSchema = z
  .object({
    passScore: z.number().int().min(0).max(100).optional(),
    attemptsAllowed: z.number().int().min(1).nullable().optional(),
  })
  .strict();

export const updateQuizSchema = z
  .object({
    passScore: z.number().int().min(0).max(100).optional(),
    attemptsAllowed: z.number().int().min(1).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const answerOptionSchema = z
  .object({
    text: nonEmptyText,
    isCorrect: z.boolean(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict();

const answerOptionsSchema = z
  .array(answerOptionSchema)
  .min(2, 'At least two answer options are required')
  .superRefine((options, ctx) => {
    if (!options.some((option) => option.isCorrect)) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one answer option must be correct',
      });
    }
  });

export const createQuestionSchema = z
  .object({
    text: nonEmptyText,
    type: z.nativeEnum(QuestionType),
    sortOrder: z.number().int().min(0).optional(),
    options: answerOptionsSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.type === QuestionType.SINGLE &&
      value.options.filter((option) => option.isCorrect).length !== 1
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'SINGLE question must have exactly one correct answer',
      });
    }
  });

export const updateQuestionSchema = z
  .object({
    text: nonEmptyText.optional(),
    type: z.nativeEnum(QuestionType).optional(),
    sortOrder: z.number().int().min(0).optional(),
    options: answerOptionsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
  .superRefine((value, ctx) => {
    if (
      value.type === QuestionType.SINGLE &&
      value.options !== undefined &&
      value.options.filter((option) => option.isCorrect).length !== 1
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'SINGLE question must have exactly one correct answer',
      });
    }
  });

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

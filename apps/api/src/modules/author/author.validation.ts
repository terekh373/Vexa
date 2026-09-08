import { ContentType, CourseStatus, LessonType } from '@prisma/client';
import { z } from 'zod';

const uuid = z.string().uuid();
const title = z.string().trim().min(1).max(180);
const nullableUuid = uuid.nullable();

export const courseIdParamsSchema = z.object({ id: uuid }).strict();
export const moduleIdParamsSchema = z.object({ id: uuid }).strict();
export const lessonIdParamsSchema = z.object({ id: uuid }).strict();

const courseWritableFields = {
  type: z.nativeEnum(ContentType),
  title,
  categoryId: uuid,
  shortDescription: z.string().max(400),
  description: z.string(),
  outcomes: z.array(z.string().trim().min(1)),
  language: z.string().trim().min(1).max(5),
  grade: z.number().int().min(1).max(11).nullable(),
  priceAmount: z.number().int().min(0),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  coverFileId: nullableUuid,
};

export const createCourseSchema = z
  .object({
    ...courseWritableFields,
    type: courseWritableFields.type,
    title: courseWritableFields.title,
    categoryId: courseWritableFields.categoryId,
    shortDescription: courseWritableFields.shortDescription.optional(),
    description: courseWritableFields.description.optional(),
    outcomes: courseWritableFields.outcomes.optional(),
    language: courseWritableFields.language.optional(),
    grade: courseWritableFields.grade.optional(),
    priceAmount: courseWritableFields.priceAmount.optional(),
    currency: courseWritableFields.currency.optional(),
    coverFileId: courseWritableFields.coverFileId.optional(),
  })
  .strict();

export const updateCourseSchema = z
  .object({
    ...courseWritableFields,
    slug: z.string().trim().min(1).max(180),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const authorCourseListQuerySchema = z
  .object({
    status: z.nativeEnum(CourseStatus).optional(),
  })
  .strict();

export const createModuleSchema = z
  .object({
    title,
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict();

export const updateModuleSchema = z
  .object({
    title: title.optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const authorLessonType = z
  .nativeEnum(LessonType)
  .refine((value) => value !== LessonType.QUIZ, { message: 'Only VIDEO, TEXT and FILE lessons are supported' });
const lessonWritableFields = {
  type: authorLessonType,
  title,
  sortOrder: z.number().int().min(0),
  isFreePreview: z.boolean(),
  textContent: z.string().nullable(),
  videoFileId: nullableUuid,
  durationSec: z.number().int().min(0).nullable(),
  fileIds: z.array(uuid),
};

export const createLessonSchema = z
  .object({
    type: lessonWritableFields.type,
    title: lessonWritableFields.title,
    sortOrder: lessonWritableFields.sortOrder.optional(),
    isFreePreview: lessonWritableFields.isFreePreview.optional(),
    textContent: lessonWritableFields.textContent.optional(),
    videoFileId: lessonWritableFields.videoFileId.optional(),
    durationSec: lessonWritableFields.durationSec.optional(),
    fileIds: lessonWritableFields.fileIds.optional(),
  })
  .strict();

export const updateLessonSchema = z
  .object({
    type: lessonWritableFields.type.optional(),
    title: lessonWritableFields.title.optional(),
    sortOrder: lessonWritableFields.sortOrder.optional(),
    isFreePreview: lessonWritableFields.isFreePreview.optional(),
    textContent: lessonWritableFields.textContent.optional(),
    videoFileId: lessonWritableFields.videoFileId.optional(),
    durationSec: lessonWritableFields.durationSec.optional(),
    fileIds: lessonWritableFields.fileIds.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const reorderItemSchema = z.object({ id: uuid, sortOrder: z.number().int().min(0) }).strict();
const nestedModuleReorderSchema = z
  .object({
    id: uuid,
    sortOrder: z.number().int().min(0),
    lessons: z.array(reorderItemSchema).optional(),
  })
  .strict();

export const reorderCourseSchema = z
  .object({
    modules: z.array(nestedModuleReorderSchema).default([]),
    lessons: z.array(reorderItemSchema).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    const moduleIds = new Set<string>();
    const lessonIds = new Set<string>();

    for (const [moduleIndex, module] of value.modules.entries()) {
      if (moduleIds.has(module.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['modules', moduleIndex, 'id'],
          message: 'Duplicate module id',
        });
      }
      moduleIds.add(module.id);

      for (const [lessonIndex, lesson] of (module.lessons ?? []).entries()) {
        if (lessonIds.has(lesson.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['modules', moduleIndex, 'lessons', lessonIndex, 'id'],
            message: 'Duplicate lesson id',
          });
        }
        lessonIds.add(lesson.id);
      }
    }

    for (const [lessonIndex, lesson] of value.lessons.entries()) {
      if (lessonIds.has(lesson.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['lessons', lessonIndex, 'id'],
          message: 'Duplicate lesson id',
        });
      }
      lessonIds.add(lesson.id);
    }
  });

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type AuthorCourseListQuery = z.infer<typeof authorCourseListQuerySchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type ReorderCourseInput = z.infer<typeof reorderCourseSchema>;

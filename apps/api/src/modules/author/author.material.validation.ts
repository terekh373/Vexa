import { z } from 'zod';

const uuid = z.string().uuid();
const title = z.string().trim().min(1).max(180);

export const materialCourseParamsSchema = z.object({ id: uuid }).strict();
export const courseFileParamsSchema = z.object({ id: uuid, courseFileId: uuid }).strict();

export const addCourseFileSchema = z.object({ fileId: uuid, title }).strict();
export const updateCourseFileSchema = z.object({ title }).strict();

export const reorderCourseFilesSchema = z
  .object({
    files: z.array(z.object({ id: uuid, sortOrder: z.number().int().min(0) }).strict()),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set<string>();

    for (const [index, file] of value.files.entries()) {
      if (ids.has(file.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['files', index, 'id'],
          message: 'Duplicate course file id',
        });
      }
      ids.add(file.id);
    }
  });

export type AddCourseFileInput = z.infer<typeof addCourseFileSchema>;
export type UpdateCourseFileInput = z.infer<typeof updateCourseFileSchema>;
export type ReorderCourseFilesInput = z.infer<typeof reorderCourseFilesSchema>;

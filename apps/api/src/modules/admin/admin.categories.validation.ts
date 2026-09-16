import { z } from 'zod';

const uuid = z.string().uuid();

export const categoryIdParamsSchema = z.object({ id: uuid }).strict();

const slug = z
  .string()
  .trim()
  .min(2, 'Слаг має містити від 2 до 120 символів')
  .max(120, 'Слаг має містити від 2 до 120 символів')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Слаг може містити лише малі латинські літери, цифри та дефіси через тире');

const nameUk = z.string().trim().min(1, 'Назва обов’язкова').max(120, 'Назва занадто довга (максимум 120 символів)');

const nameEn = z.string().trim().min(1, 'Назва занадто коротка').max(120, 'Назва занадто довга (максимум 120 символів)').nullable();

const iconKey = z.string().trim().min(1, 'Ключ іконки не може бути порожнім').max(64, 'Ключ іконки занадто довгий (максимум 64 символи)').nullable();

const parentId = uuid.nullable();

const sortOrder = z.number().int().min(0).max(10_000);

const isActive = z.boolean();

export const createCategorySchema = z
  .object({
    slug,
    nameUk,
    nameEn: nameEn.optional(),
    iconKey: iconKey.optional(),
    parentId: parentId.optional(),
    sortOrder: sortOrder.default(0),
    isActive: isActive.default(true),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    slug,
    nameUk,
    nameEn,
    iconKey,
    parentId,
    sortOrder,
    isActive,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Потрібно вказати хоча б одне поле' });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

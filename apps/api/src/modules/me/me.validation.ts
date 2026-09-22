import { passwordSchema, registerSchema } from '@vexa/shared';
import { z } from 'zod';

const optionalProfileText = (max: number, tooLongMessage: string) =>
  z
    .string()
    .trim()
    .max(max, tooLongMessage)
    .nullable()
    .optional();

export const updateMeSchema = z
  .object({
    fullName: registerSchema.shape.fullName.optional(),
    avatarFileId: z.string().uuid('Некоректний id файлу аватара').nullable().optional(),
  })
  .refine(
    (value) => value.fullName !== undefined || value.avatarFileId !== undefined,
    { message: 'Передайте хоча б одне поле для оновлення' },
  );

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Введіть поточний пароль'),
  newPassword: passwordSchema,
});

export const authorProfileCreateSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Ім'я автора має містити щонайменше 2 символи")
      .max(160, "Ім'я автора не може бути довшим за 160 символів"),
    headline: optionalProfileText(255, 'Заголовок не може бути довшим за 255 символів'),
    bio: optionalProfileText(5000, 'Опис не може бути довшим за 5000 символів'),
  })
  .strict();

export const authorProfileUpdateSchema = authorProfileCreateSchema
  .partial()
  .refine(
    (value) =>
      value.displayName !== undefined ||
      value.headline !== undefined ||
      value.bio !== undefined,
    { message: 'Передайте хоча б одне поле для оновлення' },
  );

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AuthorProfileCreateInput = z.infer<typeof authorProfileCreateSchema>;
export type AuthorProfileUpdateInput = z.infer<typeof authorProfileUpdateSchema>;

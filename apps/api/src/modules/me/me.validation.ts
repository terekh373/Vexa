import { passwordSchema, registerSchema } from '@vexa/shared';
import { z } from 'zod';

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

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

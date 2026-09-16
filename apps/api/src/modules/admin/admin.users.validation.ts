import { UserStatus } from '@prisma/client';
import { z } from 'zod';

export const userIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const updateUserStatusSchema = z
  .object({
    status: z.nativeEnum(UserStatus),
  })
  .strict();

export const verifyAuthorSchema = z
  .object({
    isVerified: z.boolean(),
  })
  .strict();

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type VerifyAuthorInput = z.infer<typeof verifyAuthorSchema>;

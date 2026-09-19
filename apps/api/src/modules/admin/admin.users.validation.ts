import { UserRole, UserStatus } from '@prisma/client';
import { z } from 'zod';

export const userIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

const optionalUserSearchSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).max(255).optional(),
);

export const adminUserListQuerySchema = z
  .object({
    q: optionalUserSearchSchema,
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

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

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type VerifyAuthorInput = z.infer<typeof verifyAuthorSchema>;

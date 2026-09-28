import { z } from 'zod';

export const notificationIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const notificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

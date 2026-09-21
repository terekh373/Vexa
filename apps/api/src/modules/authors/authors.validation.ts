import { z } from 'zod';

export const authorIdParamsSchema = z.object({
  id: z.string().uuid('Некоректний id автора'),
});

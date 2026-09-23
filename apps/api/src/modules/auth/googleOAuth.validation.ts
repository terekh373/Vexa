import { z } from 'zod';

export const googleExchangeSchema = z.object({
  code: z.string().trim().min(20, 'Missing Google exchange code').max(256),
});

export type GoogleExchangeInput = z.infer<typeof googleExchangeSchema>;

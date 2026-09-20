import { emailSchema } from '@vexa/shared';
import { z } from 'zod';

export const supportContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ім'я має містити щонайменше 2 символи")
    .max(160, "Ім'я не може бути довшим за 160 символів"),
  email: emailSchema,
  message: z
    .string()
    .trim()
    .min(10, 'Повідомлення має містити щонайменше 10 символів')
    .max(5000, 'Повідомлення не може бути довшим за 5000 символів'),
});

export type SupportContactInput = z.infer<typeof supportContactSchema>;

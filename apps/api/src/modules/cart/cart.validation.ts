import { z } from 'zod';

export const addCartItemSchema = z
  .object({
    courseId: z.string().uuid('Некоректний ідентифікатор курсу'),
  })
  .strict();

export const cartCourseParamsSchema = z
  .object({
    courseId: z.string().uuid('Некоректний ідентифікатор курсу'),
  })
  .strict();

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type CartCourseParams = z.infer<typeof cartCourseParamsSchema>;

import { z } from 'zod';

const emptyStringToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalInteger = (minimum: number, maximum: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(minimum).max(maximum).optional(),
  );

const integerWithDefault = (
  minimum: number,
  maximum: number,
  defaultValue: number,
) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(minimum).max(maximum).default(defaultValue),
  );

const optionalNumber = (minimum: number, maximum: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().min(minimum).max(maximum).optional(),
  );

export const courseCatalogQuerySchema = z
  .object({
    q: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(120).optional(),
    ),

    type: z.preprocess(
      (value) =>
        typeof value === 'string'
          ? value.trim().toLowerCase()
          : value,
      z.enum(['course', 'material']).optional(),
    ),

    category: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(120).optional(),
    ),

    grade: optionalInteger(1, 11),

    priceMin: optionalInteger(0, 100_000_000),
    priceMax: optionalInteger(0, 100_000_000),

    rating: optionalNumber(1, 5),

    language: z.preprocess(
      (value) =>
        typeof value === 'string'
          ? value.trim().toLowerCase()
          : value,
      z.enum(['uk', 'en']).optional(),
    ),

    sort: z.preprocess(
      (value) =>
        typeof value === 'string'
          ? value.trim().toLowerCase()
          : value,
      z
        .enum([
          'relevance',
          'popularity',
          'rating',
          'date',
          'price_asc',
          'price_desc',
        ])
        .default('relevance'),
    ),

    page: integerWithDefault(1, 100_000, 1),
    limit: integerWithDefault(1, 50, 20),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.priceMin !== undefined &&
      value.priceMax !== undefined &&
      value.priceMin > value.priceMax
    ) {
      context.addIssue({
        code: 'custom',
        path: ['priceMax'],
        message: 'priceMax має бути не меншим за priceMin.',
      });
    }
  });

export type CourseCatalogQuery = z.infer<
  typeof courseCatalogQuerySchema
>;
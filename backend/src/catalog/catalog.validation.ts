import { z } from 'zod';
import { HttpError } from '../http/errors.js';

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
) => optionalInteger(minimum, maximum).default(defaultValue);

const optionalNumber = (minimum: number, maximum: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().min(minimum).max(maximum).optional(),
  );

export const courseCatalogQuerySchema = z
  .object({
    q: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(2).max(120).optional(),
    ),
    type: z.preprocess(
      (value) => (typeof value === 'string' ? value.toLowerCase() : value),
      z.enum(['course', 'material']).optional(),
    ),
    category: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(120).optional(),
    ),
    grade: optionalInteger(1, 11),
    minPrice: optionalInteger(0, 100_000_000),
    maxPrice: optionalInteger(0, 100_000_000),
    minRating: optionalNumber(0, 5),
    language: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
      z.string().regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/).optional(),
    ),
    sort: z.preprocess(
      (value) => (typeof value === 'string' ? value.toLowerCase() : value),
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
    limit: integerWithDefault(1, 100, 20),
    offset: integerWithDefault(0, 100_000, 0),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.minPrice > value.maxPrice
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxPrice'],
        message: 'maxPrice має бути не меншим за minPrice.',
      });
    }
  });

export type CourseCatalogQuery = z.infer<typeof courseCatalogQuerySchema>;

export const parseCourseCatalogQuery = (url: URL): CourseCatalogQuery => {
  const rawQuery = Object.fromEntries(url.searchParams.entries());
  const parsed = courseCatalogQuerySchema.safeParse(rawQuery);

  if (!parsed.success) {
    throw new HttpError(
      400,
      'INVALID_CATALOG_QUERY',
      'Параметри каталогу некоректні.',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  return parsed.data;
};

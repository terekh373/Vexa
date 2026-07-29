import { HttpError } from '../http/errors.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const parseCourseId = (rawId: string): string => {
  let id: string;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    throw new HttpError(400, 'INVALID_COURSE_ID', 'Ідентифікатор курсу некоректний.');
  }

  if (!UUID_PATTERN.test(id)) {
    throw new HttpError(
      400,
      'INVALID_COURSE_ID',
      'Ідентифікатор курсу має бути UUID.',
    );
  }
  return id;
};

const parsePositiveInteger = (
  value: string | null,
  fallback: number,
  field: string,
): number => {
  if (value === null || value === '') {
    return fallback;
  }
  if (!/^\d+$/.test(value)) {
    throw new HttpError(400, 'INVALID_QUERY', `Параметр ${field} має бути цілим числом.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new HttpError(400, 'INVALID_QUERY', `Параметр ${field} має бути більшим за 0.`);
  }
  return parsed;
};

export interface ReviewsPagination {
  page: number;
  limit: number;
}

export const parseReviewsPagination = (url: URL): ReviewsPagination => {
  const page = parsePositiveInteger(url.searchParams.get('page'), 1, 'page');
  const limit = parsePositiveInteger(url.searchParams.get('limit'), 10, 'limit');

  if (limit > 100) {
    throw new HttpError(400, 'INVALID_QUERY', 'Параметр limit не може перевищувати 100.');
  }

  return { page, limit };
};

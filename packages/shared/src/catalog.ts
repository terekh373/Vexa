export const CATALOG_CONTENT_TYPES = ['course', 'material'] as const;

export type CatalogContentType = (typeof CATALOG_CONTENT_TYPES)[number];

export const CATALOG_SORTS = [
  'relevance',
  'popularity',
  'rating',
  'date',
  'price_asc',
  'price_desc',
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];

export interface CatalogCourseCover {
  id: string;
  name: string;
  mimeType: string;
  url: string | null;
}

export interface CatalogCourseAuthor {
  id: string;
  displayName: string;
  isVerified: boolean;
}

export interface CatalogCourseCategory {
  id: string;
  slug: string;
  name: string;
}

export interface CatalogCourseCard {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  contentType: CatalogContentType;
  language: 'uk' | 'en';
  grade: number | null;
  tags: string[];

  cover: CatalogCourseCover | null;

  author: CatalogCourseAuthor;

  category: CatalogCourseCategory;

  price: {
    amount: number;
    currency: string;
  };

  rating: {
    average: number;
    reviewsCount: number;
  };

  studentsCount: number;
  lessonsCount: number;
  durationSec: number;
  publishedAt: string | null;
}

export interface CourseCatalogResponse {
  items: CatalogCourseCard[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
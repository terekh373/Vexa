/**
 * Course card — the catalog listing shape.
 *
 * Deliberately narrower than the course page payload: the catalog renders
 * hundreds of these, so description, modules and lessons stay out.
 */

export type ContentType = 'COURSE' | 'MATERIAL';

export interface CourseCard {
  id: string;
  /** Reserved for slug-based URLs; the API returns it already. */
  slug: string;
  title: string;
  shortDescription: string;
  type: ContentType;
  /** Price in kopiykas. 0 means free. Never a float — divide by 100 to display. */
  priceAmount: number;
  currency: string;
  /** Absolute CDN URL of the cover, or null when the author uploaded none. */
  coverUrl: string | null;
  language: string;
  /** Target school grade, null when not tied to one. */
  grade: number | null;
  /** Decimal(3,2) in the database, serialised as a number by the API. */
  ratingAvg: number;
  reviewsCount: number;
  studentsCount: number;
  lessonsCount: number;
  durationSec: number;
  author: {
    id: string;
    displayName: string;
    isVerified: boolean;
  };
  category: {
    slug: string;
    nameUk: string;
  };
}

/** Paginated envelope shared by every list endpoint. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
// Shared domain types and zod schemas live here.
// Course lifecycle statuses, per section 15.6 of the SRS.
export const COURSE_STATUSES = [
  'draft',
  'moderation',
  'published',
  'rejected',
  'unpublished',
] as const;

export type CourseStatus = (typeof COURSE_STATUSES)[number];

export * from './auth.js';
export * from './course.js';
export * from './routes.js';
export * from './catalog.js';
export * from './file.js';
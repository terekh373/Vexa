import { CourseStatus } from '@prisma/client';

export type CourseAccess = 'ADMIN' | 'AUTHOR' | 'ENROLLED' | 'PREVIEW' | 'NOT_FOUND';

export type LessonAccess = CourseAccess | 'FORBIDDEN';

export interface CourseAccessInput {
  isAdmin: boolean;
  isCourseAuthor: boolean;
  hasActiveEnrollment: boolean;
  courseStatus: CourseStatus;
}

export interface LessonAccessInput extends CourseAccessInput {
  isFreePreview: boolean;
}

/**
 * The single home of the access rule order; lesson access is derived from it.
 * Order matters and is not interchangeable:
 *   - Step 3 (active Enrollment) is checked before step 4 (course status)
 *     because a purchase must survive the course being unpublished later —
 *     only Enrollment.revokedAt closes paid access, never a status change.
 *   - Step 4 then turns any non-PUBLISHED course into NOT_FOUND for everyone
 *     without a qualifying role or enrollment, matching the public course
 *     endpoint: for such a user the course simply does not exist.
 *   - Step 5: a published course with no rights is visible in PREVIEW mode.
 */
export function decideCourseAccess(input: CourseAccessInput): CourseAccess {
  if (input.isAdmin) return 'ADMIN';
  if (input.isCourseAuthor) return 'AUTHOR';
  if (input.hasActiveEnrollment) return 'ENROLLED';
  if (input.courseStatus !== CourseStatus.PUBLISHED) return 'NOT_FOUND';
  return 'PREVIEW';
}

export function decideLessonAccess(input: LessonAccessInput): LessonAccess {
  const access = decideCourseAccess(input);

  if (access === 'PREVIEW') return input.isFreePreview ? 'PREVIEW' : 'FORBIDDEN';
  return access;
}

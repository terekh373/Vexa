import { CourseStatus } from '@prisma/client';

export type LessonAccess = 'ADMIN' | 'AUTHOR' | 'ENROLLED' | 'PREVIEW' | 'NOT_FOUND' | 'FORBIDDEN';

export interface LessonAccessInput {
  isAdmin: boolean;
  isCourseAuthor: boolean;
  hasActiveEnrollment: boolean;
  courseStatus: CourseStatus;
  isFreePreview: boolean;
}

/**
 * Order matters and is not interchangeable:
 *   - Step 3 (active Enrollment) is checked before step 4 (course status)
 *     because a purchase must survive the course being unpublished later —
 *     only Enrollment.revokedAt closes paid access, never a status change.
 *   - Step 4 then turns any non-PUBLISHED course into NOT_FOUND for everyone
 *     without a qualifying role or enrollment, matching the public course
 *     endpoint: for such a user the course simply does not exist.
 */
export function decideLessonAccess(input: LessonAccessInput): LessonAccess {
  if (input.isAdmin) return 'ADMIN';
  if (input.isCourseAuthor) return 'AUTHOR';
  if (input.hasActiveEnrollment) return 'ENROLLED';
  if (input.courseStatus !== CourseStatus.PUBLISHED) return 'NOT_FOUND';
  if (input.isFreePreview) return 'PREVIEW';
  return 'FORBIDDEN';
}

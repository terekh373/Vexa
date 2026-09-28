import { CourseStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { decideCourseAccess, decideLessonAccess } from '../../src/modules/learning/lesson-access.js';

describe('decideLessonAccess', () => {
  it('admin wins even on a DRAFT course', () => {
    expect(
      decideLessonAccess({
        isAdmin: true,
        isCourseAuthor: false,
        hasActiveEnrollment: false,
        courseStatus: CourseStatus.DRAFT,
        isFreePreview: false,
      }),
    ).toBe('ADMIN');
  });

  it('course author wins on a DRAFT course', () => {
    expect(
      decideLessonAccess({
        isAdmin: false,
        isCourseAuthor: true,
        hasActiveEnrollment: false,
        courseStatus: CourseStatus.DRAFT,
        isFreePreview: false,
      }),
    ).toBe('AUTHOR');
  });

  it('an active enrollment grants access on an UNPUBLISHED course', () => {
    expect(
      decideLessonAccess({
        isAdmin: false,
        isCourseAuthor: false,
        hasActiveEnrollment: true,
        courseStatus: CourseStatus.UNPUBLISHED,
        isFreePreview: false,
      }),
    ).toBe('ENROLLED');
  });

  it('no enrollment on an UNPUBLISHED preview lesson is NOT_FOUND, not PREVIEW', () => {
    expect(
      decideLessonAccess({
        isAdmin: false,
        isCourseAuthor: false,
        hasActiveEnrollment: false,
        courseStatus: CourseStatus.UNPUBLISHED,
        isFreePreview: true,
      }),
    ).toBe('NOT_FOUND');
  });

  it('no enrollment on a PUBLISHED preview lesson is PREVIEW', () => {
    expect(
      decideLessonAccess({
        isAdmin: false,
        isCourseAuthor: false,
        hasActiveEnrollment: false,
        courseStatus: CourseStatus.PUBLISHED,
        isFreePreview: true,
      }),
    ).toBe('PREVIEW');
  });

  it('no enrollment on a PUBLISHED non-preview lesson is FORBIDDEN', () => {
    expect(
      decideLessonAccess({
        isAdmin: false,
        isCourseAuthor: false,
        hasActiveEnrollment: false,
        courseStatus: CourseStatus.PUBLISHED,
        isFreePreview: false,
      }),
    ).toBe('FORBIDDEN');
  });
});

describe('decideCourseAccess', () => {
  const base = { isAdmin: false, isCourseAuthor: false, hasActiveEnrollment: false };

  it('admin wins even on a DRAFT course', () => {
    expect(decideCourseAccess({ ...base, isAdmin: true, courseStatus: CourseStatus.DRAFT })).toBe('ADMIN');
  });

  it('course author wins on a DRAFT course', () => {
    expect(decideCourseAccess({ ...base, isCourseAuthor: true, courseStatus: CourseStatus.DRAFT })).toBe('AUTHOR');
  });

  it('an active enrollment grants access on an UNPUBLISHED course', () => {
    expect(decideCourseAccess({ ...base, hasActiveEnrollment: true, courseStatus: CourseStatus.UNPUBLISHED })).toBe(
      'ENROLLED',
    );
  });

  it('no rights on an UNPUBLISHED course is NOT_FOUND', () => {
    expect(decideCourseAccess({ ...base, courseStatus: CourseStatus.UNPUBLISHED })).toBe('NOT_FOUND');
  });

  it('no rights on a PUBLISHED course is PREVIEW', () => {
    expect(decideCourseAccess({ ...base, courseStatus: CourseStatus.PUBLISHED })).toBe('PREVIEW');
  });
});

import { CourseStatus, ModerationAction, type Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import {
  findAdminCourseById,
  findModerationCandidate,
  findModerationQueue,
  transitionCourseStatus,
} from './admin.courses.repository.js';
import type {
  AdminCourseListQuery,
  ModerateCourseInput,
  UnpublishCourseInput,
} from './admin.courses.validation.js';

const NOTIFICATION_TITLE_MAX_LENGTH = 180;

function truncateTitle(title: string): string {
  return title.length > NOTIFICATION_TITLE_MAX_LENGTH ? title.slice(0, NOTIFICATION_TITLE_MAX_LENGTH) : title;
}

export async function listModerationQueue(query: AdminCourseListQuery) {
  const { items, total } = await findModerationQueue(query);

  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getAdminCourse(courseId: string) {
  const course = await findAdminCourseById(courseId);
  if (course === null) throw AppError.notFound('Course not found');

  const { moderationLog, ...rest } = course;
  return { ...rest, moderationHistory: moderationLog };
}

export async function moderateCourse(moderatorId: string, courseId: string, input: ModerateCourseInput) {
  const course = await findModerationCandidate(courseId);
  if (course === null) throw AppError.notFound('Course not found');
  if (course.status !== CourseStatus.MODERATION) {
    throw AppError.conflict('Course is not awaiting moderation');
  }

  const comment = input.comment ?? null;
  const isApproval = input.action === 'APPROVE';
  const nextStatus = isApproval ? CourseStatus.PUBLISHED : CourseStatus.REJECTED;

  const data: Prisma.CourseUpdateManyMutationInput = isApproval
    ? { status: CourseStatus.PUBLISHED, publishedAt: course.publishedAt ?? new Date(), rejectionReason: null }
    : { status: CourseStatus.REJECTED, rejectionReason: comment };

  const title = truncateTitle(
    isApproval ? `Курс «${course.title}» опубліковано` : `Курс «${course.title}» відхилено`,
  );

  const applied = await transitionCourseStatus({
    courseId,
    expectedStatus: CourseStatus.MODERATION,
    nextStatus,
    data,
    action: isApproval ? ModerationAction.APPROVED : ModerationAction.REJECTED,
    moderatorId,
    comment,
    notification: {
      userId: course.authorId,
      title,
      body: comment,
      payload: { courseId, status: nextStatus },
    },
  });

  // The pre-check above already read MODERATION, so count === 0 here means a
  // second moderator won the race between that read and this transaction.
  if (!applied) throw AppError.conflict('Course status changed concurrently');

  return getAdminCourse(courseId);
}

export async function unpublishCourse(moderatorId: string, courseId: string, input: UnpublishCourseInput) {
  const course = await findModerationCandidate(courseId);
  if (course === null) throw AppError.notFound('Course not found');
  if (course.status !== CourseStatus.PUBLISHED) {
    throw AppError.conflict('Course is not published');
  }

  const title = truncateTitle(`Курс «${course.title}» знято з публікації`);

  const applied = await transitionCourseStatus({
    courseId,
    expectedStatus: CourseStatus.PUBLISHED,
    nextStatus: CourseStatus.UNPUBLISHED,
    data: { status: CourseStatus.UNPUBLISHED, rejectionReason: input.comment },
    action: ModerationAction.UNPUBLISHED,
    moderatorId,
    comment: input.comment,
    notification: {
      userId: course.authorId,
      title,
      body: input.comment,
      payload: { courseId, status: CourseStatus.UNPUBLISHED },
    },
  });

  if (!applied) throw AppError.conflict('Course status changed concurrently');

  return getAdminCourse(courseId);
}

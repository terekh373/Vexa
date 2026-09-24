/**
 * Persistence for course moderation. The status transition (moderate /
 * unpublish) is the one place in this module that touches more than one
 * table, so it is exposed as a single atomic function rather than separate
 * update/create calls the service would have to sequence itself.
 */
import { type CourseStatus, type ModerationAction, type Prisma, NotificationType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { AdminCourseListQuery } from './admin.courses.validation.js';

const adminCourseListSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  status: true,
  priceAmount: true,
  currency: true,
  lessonsCount: true,
  durationSec: true,
  submittedAt: true,
  publishedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { id: true, slug: true, nameUk: true },
  },
  author: {
    select: { id: true, fullName: true, email: true },
  },
} satisfies Prisma.CourseSelect;

export type AdminCourseListItem = Prisma.CourseGetPayload<{ select: typeof adminCourseListSelect }>;

const adminFullCourseSelect = {
  id: true,
  type: true,
  status: true,
  slug: true,
  title: true,
  shortDescription: true,
  categoryId: true,
  coverFileId: true,
  description: true,
  outcomes: true,
  language: true,
  grade: true,
  priceAmount: true,
  currency: true,
  lessonsCount: true,
  durationSec: true,
  submittedAt: true,
  publishedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { id: true, slug: true, nameUk: true, nameEn: true },
  },
  cover: {
    select: { id: true, kind: true, originalName: true, mimeType: true, isReady: true },
  },
  author: {
    select: { id: true, fullName: true, email: true },
  },
  modules: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      lessons: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          type: true,
          title: true,
          sortOrder: true,
          isFreePreview: true,
          textContent: true,
          videoFileId: true,
          durationSec: true,
          createdAt: true,
          updatedAt: true,
          video: {
            select: {
              id: true,
              kind: true,
              originalName: true,
              mimeType: true,
              durationSec: true,
              isReady: true,
            },
          },
          files: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              fileId: true,
              sortOrder: true,
              file: {
                select: {
                  id: true,
                  kind: true,
                  originalName: true,
                  mimeType: true,
                  isReady: true,
                },
              },
            },
          },
          quiz: {
            select: {
              id: true,
              lessonId: true,
              title: true,
              passScore: true,
              timeLimitSec: true,
              attemptsAllowed: true,
              createdAt: true,
              updatedAt: true,
              questions: {
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                select: {
                  id: true,
                  type: true,
                  text: true,
                  points: true,
                  sortOrder: true,
                  createdAt: true,
                  updatedAt: true,
                  options: {
                    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                    select: {
                      id: true,
                      text: true,
                      isCorrect: true,
                      sortOrder: true,
                      createdAt: true,
                      updatedAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  moderationLog: {
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      action: true,
      fromStatus: true,
      toStatus: true,
      comment: true,
      createdAt: true,
      moderator: { select: { id: true, fullName: true } },
    },
  },
} satisfies Prisma.CourseSelect;

export type AdminFullCourse = Prisma.CourseGetPayload<{ select: typeof adminFullCourseSelect }>;

export interface ModerationCandidate {
  id: string;
  status: CourseStatus;
  title: string;
  authorId: string;
  authorEmail: string;
  publishedAt: Date | null;
}

export async function findModerationQueue(
  query: AdminCourseListQuery,
): Promise<{ items: AdminCourseListItem[]; total: number }> {
  const where: Prisma.CourseWhereInput = { status: query.status, deletedAt: null };
  const orderBy: Prisma.CourseOrderByWithRelationInput[] =
    query.status === 'MODERATION'
      ? [{ submittedAt: 'asc' }, { id: 'asc' }]
      : [{ updatedAt: 'desc' }, { id: 'asc' }];

  const [items, total] = await prisma.$transaction([
    prisma.course.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: adminCourseListSelect,
    }),
    prisma.course.count({ where }),
  ]);

  return { items, total };
}

export async function findAdminCourseById(courseId: string): Promise<AdminFullCourse | null> {
  return prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: adminFullCourseSelect,
  });
}

export async function findModerationCandidate(courseId: string): Promise<ModerationCandidate | null> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: {
      id: true,
      status: true,
      title: true,
      authorId: true,
      publishedAt: true,
      author: { select: { email: true } },
    },
  });
  if (course === null) return null;

  const { author, ...rest } = course;
  return { ...rest, authorEmail: author.email };
}

export interface CourseStatusTransitionInput {
  courseId: string;
  expectedStatus: CourseStatus;
  nextStatus: CourseStatus;
  data: Prisma.CourseUpdateManyMutationInput;
  action: ModerationAction;
  moderatorId: string;
  comment: string | null;
  notification: {
    userId: string;
    title: string;
    body: string | null;
    payload: Prisma.InputJsonValue;
  };
}

/**
 * Applies a course status transition, the moderation log entry and the
 * author notification in one transaction. `expectedStatus` is written back
 * as the log's fromStatus rather than a freshly re-read value, so a
 * concurrent moderator racing the same course cannot corrupt the trail —
 * the updateMany's own where clause is what decides whether this call wins.
 */
export async function transitionCourseStatus(input: CourseStatusTransitionInput): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const result = await tx.course.updateMany({
      where: { id: input.courseId, status: input.expectedStatus, deletedAt: null },
      data: input.data,
    });

    if (result.count === 0) return false;

    await tx.moderationLog.create({
      data: {
        courseId: input.courseId,
        moderatorId: input.moderatorId,
        action: input.action,
        fromStatus: input.expectedStatus,
        toStatus: input.nextStatus,
        comment: input.comment,
      },
    });

    await tx.notification.create({
      data: {
        userId: input.notification.userId,
        type: NotificationType.MODERATION,
        title: input.notification.title,
        body: input.notification.body,
        payload: input.notification.payload,
      },
    });

    return true;
  });
}

/**
 * Persistence for the lesson player. Prisma calls only — access decisions
 * live in lesson-access.ts and learning.service.ts.
 */
import { ProgressStatus, type ContentType, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const lessonForLearnerSelect = {
  id: true,
  type: true,
  title: true,
  sortOrder: true,
  isFreePreview: true,
  textContent: true,
  durationSec: true,

  module: {
    select: {
      id: true,
      course: {
        select: {
          id: true,
          authorId: true,
          status: true,
        },
      },
    },
  },

  video: {
    select: {
      provider: true,
      storageKey: true,
      isReady: true,
      durationSec: true,
    },
  },

  // Only ready, non-deleted attachments: a pending or soft-deleted file is
  // not something the player should ever offer the student.
  files: {
    where: { file: { deletedAt: null, isReady: true } },
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      file: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
    },
  },

  quiz: {
    select: {
      id: true,
      title: true,
      passScore: true,
      timeLimitSec: true,
      attemptsAllowed: true,
      questions: {
        orderBy: { sortOrder: 'asc' as const },
        select: {
          id: true,
          type: true,
          text: true,
          points: true,
          sortOrder: true,
          // isCorrect is deliberately left out: this module never sends it
          // to a learner client.
          options: {
            orderBy: { sortOrder: 'asc' as const },
            select: {
              id: true,
              text: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.LessonSelect;

export type LessonForLearner = Prisma.LessonGetPayload<{ select: typeof lessonForLearnerSelect }>;

export async function findLessonForLearner(lessonId: string): Promise<LessonForLearner | null> {
  return prisma.lesson.findFirst({
    where: {
      id: lessonId,
      deletedAt: null,
      module: { deletedAt: null, course: { deletedAt: null } },
    },
    select: lessonForLearnerSelect,
  });
}

export async function hasActiveEnrollment(userId: string, courseId: string): Promise<boolean> {
  const count = await prisma.enrollment.count({
    where: { userId, courseId, revokedAt: null },
  });

  return count > 0;
}

// sortOrder is not unique in the schema: without the extra keys the order of
// equal positions would be nondeterministic.
const structureOrder: Prisma.ModuleOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
  { id: 'asc' },
];

const myEnrollmentSelect = {
  id: true,
  source: true,
  createdAt: true,
  completedAt: true,
  course: {
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      status: true,
      cover: { select: { storageKey: true } },
      category: { select: { id: true, slug: true, nameUk: true } },
      author: {
        select: {
          id: true,
          fullName: true,
          authorProfile: { select: { displayName: true } },
        },
      },
      modules: {
        where: { deletedAt: null },
        orderBy: structureOrder,
        select: {
          lessons: {
            where: { deletedAt: null },
            orderBy: structureOrder,
            select: { id: true, title: true },
          },
        },
      },
      courseFiles: {
        where: { file: { deletedAt: null, isReady: true } },
        select: { file: { select: { originalName: true, sizeBytes: true } } },
      },
    },
  },
  progress: {
    where: { status: ProgressStatus.COMPLETED },
    select: { lessonId: true },
  },
} satisfies Prisma.EnrollmentSelect;

export type MyEnrollment = Prisma.EnrollmentGetPayload<{ select: typeof myEnrollmentSelect }>;

// One query for the whole list. The course status is deliberately not
// filtered: a purchase survives the course being unpublished.
export async function findMyEnrollments(userId: string, type: ContentType | undefined): Promise<MyEnrollment[]> {
  return prisma.enrollment.findMany({
    where: {
      userId,
      revokedAt: null,
      course: { deletedAt: null, ...(type === undefined ? {} : { type }) },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    select: myEnrollmentSelect,
  });
}

const courseProgramSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  status: true,
  authorId: true,
  modules: {
    where: { deletedAt: null },
    orderBy: structureOrder,
    select: {
      id: true,
      title: true,
      sortOrder: true,
      lessons: {
        where: { deletedAt: null },
        orderBy: structureOrder,
        select: {
          id: true,
          type: true,
          title: true,
          sortOrder: true,
          isFreePreview: true,
          durationSec: true,
        },
      },
    },
  },
  courseFiles: {
    where: { file: { deletedAt: null, isReady: true } },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      title: true,
      file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
    },
  },
} satisfies Prisma.CourseSelect;

export type CourseProgram = Prisma.CourseGetPayload<{ select: typeof courseProgramSelect }>;

// Deliberately light: no text, video, attachments or quiz content.
export async function findCourseProgram(courseId: string): Promise<CourseProgram | null> {
  return prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: courseProgramSelect,
  });
}

export interface ActiveEnrollmentProgress {
  id: string;
  completedAt: Date | null;
  completedLessonIds: string[];
}

export async function findActiveEnrollmentProgress(
  userId: string,
  courseId: string,
): Promise<ActiveEnrollmentProgress | null> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId, revokedAt: null },
    select: {
      id: true,
      completedAt: true,
      progress: { where: { status: ProgressStatus.COMPLETED }, select: { lessonId: true } },
    },
  });

  if (enrollment === null) return null;

  return {
    id: enrollment.id,
    completedAt: enrollment.completedAt,
    completedLessonIds: enrollment.progress.map((entry) => entry.lessonId),
  };
}

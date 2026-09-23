/**
 * Persistence for the lesson player. Prisma calls only — access decisions
 * live in lesson-access.ts and learning.service.ts.
 */
import type { Prisma } from '@prisma/client';
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

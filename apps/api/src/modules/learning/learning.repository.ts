/**
 * Persistence for the lesson player. Prisma calls only — access decisions
 * live in lesson-access.ts and learning.service.ts.
 */
import {
  EnrollmentSource,
  ProgressStatus,
  type ContentType,
  type CourseStatus,
  type LessonType,
  type Prisma,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { refreshStudentCounters } from '../../lib/student-counters.js';
import type { EnrollmentProgressDecision, EnrollmentProgressSnapshot } from './progress.js';
import type { GradingResult } from './quiz-grading.js';

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

// ---------------------------------------------------------------------------
// Writes: enrollment, lesson completion, quiz attempts
// ---------------------------------------------------------------------------

export interface CourseForEnrollment {
  id: string;
  authorId: string;
  status: CourseStatus;
  priceAmount: number;
}

export async function findCourseForEnrollment(courseId: string): Promise<CourseForEnrollment | null> {
  return prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, authorId: true, status: true, priceAmount: true },
  });
}

export interface LessonForProgress {
  id: string;
  type: LessonType;
  isFreePreview: boolean;
  hasQuiz: boolean;
  course: { id: string; authorId: string; status: CourseStatus };
}

export async function findLessonForProgress(lessonId: string): Promise<LessonForProgress | null> {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null, module: { deletedAt: null, course: { deletedAt: null } } },
    select: {
      id: true,
      type: true,
      isFreePreview: true,
      quiz: { select: { id: true } },
      module: { select: { course: { select: { id: true, authorId: true, status: true } } } },
    },
  });

  if (lesson === null) return null;

  return {
    id: lesson.id,
    type: lesson.type,
    isFreePreview: lesson.isFreePreview,
    hasQuiz: lesson.quiz !== null,
    course: lesson.module.course,
  };
}

export async function findActiveEnrollmentId(userId: string, courseId: string): Promise<string | null> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId, revokedAt: null },
    select: { id: true },
  });

  return enrollment?.id ?? null;
}

export interface EnrollmentRecord {
  id: string;
  source: EnrollmentSource;
  createdAt: Date;
}

const enrollmentRecordSelect = { id: true, source: true, createdAt: true } satisfies Prisma.EnrollmentSelect;

export interface FreeEnrollmentResult {
  kind: 'CREATED' | 'REACTIVATED' | 'EXISTS';
  enrollment: EnrollmentRecord;
}

export async function applyFreeEnrollment(input: { userId: string; courseId: string }): Promise<FreeEnrollmentResult> {
  const { userId, courseId } = input;

  return prisma.$transaction(async (tx): Promise<FreeEnrollmentResult> => {
    const existing = await tx.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { ...enrollmentRecordSelect, revokedAt: true },
    });

    if (existing !== null && existing.revokedAt === null) {
      return { kind: 'EXISTS', enrollment: existing };
    }

    if (existing !== null) {
      // Conditional on revokedAt so that of two concurrent reactivations only
      // one is reported (and counted) as such.
      const reactivated = await tx.enrollment.updateMany({
        where: { id: existing.id, revokedAt: { not: null } },
        data: { revokedAt: null, source: EnrollmentSource.FREE },
      });
      const enrollment = await tx.enrollment.findUniqueOrThrow({
        where: { id: existing.id },
        select: enrollmentRecordSelect,
      });

      if (reactivated.count === 0) return { kind: 'EXISTS', enrollment };

      await refreshStudentCounters(tx, courseId);
      return { kind: 'REACTIVATED', enrollment };
    }

    const created = await tx.enrollment.createMany({
      data: [{ userId, courseId, source: EnrollmentSource.FREE }],
      skipDuplicates: true,
    });
    const enrollment = await tx.enrollment.findUniqueOrThrow({
      where: { userId_courseId: { userId, courseId } },
      select: enrollmentRecordSelect,
    });

    // count 0: a concurrent request inserted the row first.
    if (created.count === 0) return { kind: 'EXISTS', enrollment };

    await refreshStudentCounters(tx, courseId);
    return { kind: 'CREATED', enrollment };
  });
}

async function lockEnrollment(tx: Prisma.TransactionClient, enrollmentId: string): Promise<void> {
  await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM enrollments WHERE id = ${enrollmentId}::uuid FOR UPDATE
  `;
}

// Idempotent: an already completed lesson keeps its original completedAt.
async function markLessonCompleted(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
  lessonId: string,
  now: Date,
): Promise<void> {
  const existing = await tx.lessonProgress.findUnique({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    select: { id: true, status: true },
  });

  if (existing === null) {
    await tx.lessonProgress.create({
      data: { enrollmentId, lessonId, status: ProgressStatus.COMPLETED, completedAt: now },
    });
  } else if (existing.status !== ProgressStatus.COMPLETED) {
    await tx.lessonProgress.update({
      where: { id: existing.id },
      data: { status: ProgressStatus.COMPLETED, completedAt: now },
    });
  }
}

export type DecideEnrollmentProgress = (
  snapshot: EnrollmentProgressSnapshot,
  now: Date,
) => EnrollmentProgressDecision;

async function storeEnrollmentProgress(
  tx: Prisma.TransactionClient,
  input: { enrollmentId: string; lessonId: string; courseId: string; now: Date },
  decide: DecideEnrollmentProgress,
): Promise<EnrollmentProgressDecision> {
  const { enrollmentId, lessonId, courseId, now } = input;

  const modules = await tx.module.findMany({
    where: { courseId, deletedAt: null },
    orderBy: structureOrder,
    select: {
      lessons: { where: { deletedAt: null }, orderBy: structureOrder, select: { id: true, title: true } },
    },
  });
  const enrollment = await tx.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    select: {
      completedAt: true,
      progress: { where: { status: ProgressStatus.COMPLETED }, select: { lessonId: true } },
    },
  });

  const decision = decide(
    {
      orderedLessons: modules.flatMap((learningModule) => learningModule.lessons),
      completedLessonIds: new Set(enrollment.progress.map((entry) => entry.lessonId)),
      completedAt: enrollment.completedAt,
    },
    now,
  );

  await tx.enrollment.update({
    where: { id: enrollmentId },
    data: {
      progressPercent: decision.progressPercent,
      completedAt: decision.completedAt,
      lastLessonId: lessonId,
    },
  });

  return decision;
}

export async function applyLessonCompletion(
  input: { enrollmentId: string; lessonId: string; courseId: string; now: Date },
  decide: DecideEnrollmentProgress,
): Promise<EnrollmentProgressDecision> {
  return prisma.$transaction(async (tx) => {
    // Concurrent marks of one learner are serialized on the enrollment row.
    await lockEnrollment(tx, input.enrollmentId);
    await markLessonCompleted(tx, input.enrollmentId, input.lessonId, input.now);

    return storeEnrollmentProgress(tx, input, decide);
  });
}

/**
 * The single place in this module that reads AnswerOption.isCorrect, and only
 * for grading. It reaches a client solely through shouldRevealCorrectAnswers.
 */
const quizForGradingSelect = {
  id: true,
  passScore: true,
  attemptsAllowed: true,
  lesson: {
    select: {
      id: true,
      isFreePreview: true,
      module: { select: { course: { select: { id: true, authorId: true, status: true } } } },
    },
  },
  questions: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      type: true,
      points: true,
      options: { orderBy: { sortOrder: 'asc' as const }, select: { id: true, isCorrect: true } },
    },
  },
} satisfies Prisma.QuizSelect;

export type QuizForGrading = Prisma.QuizGetPayload<{ select: typeof quizForGradingSelect }>;

export async function findQuizForGrading(quizId: string): Promise<QuizForGrading | null> {
  return prisma.quiz.findFirst({
    where: {
      id: quizId,
      lesson: { deletedAt: null, module: { deletedAt: null, course: { deletedAt: null } } },
    },
    select: quizForGradingSelect,
  });
}

export type QuizAttemptResult =
  | { kind: 'LIMIT_REACHED' }
  | { kind: 'RECORDED'; attemptId: string; attemptsUsed: number; decision: EnrollmentProgressDecision };

export interface ApplyQuizAttemptInput {
  enrollmentId: string;
  userId: string;
  quizId: string;
  lessonId: string;
  courseId: string;
  grading: Extract<GradingResult, { ok: true }>;
  now: Date;
}

export async function applyQuizAttempt(
  input: ApplyQuizAttemptInput,
  decisions: { canAttempt: (attemptsUsed: number) => boolean; decideProgress: DecideEnrollmentProgress },
): Promise<QuizAttemptResult> {
  const { enrollmentId, userId, quizId, lessonId, grading, now } = input;

  return prisma.$transaction(async (tx): Promise<QuizAttemptResult> => {
    // Two parallel attempts of one learner queue here, so the limit holds.
    await lockEnrollment(tx, enrollmentId);

    const attemptsUsed = await tx.quizAttempt.count({ where: { quizId, userId } });
    if (!decisions.canAttempt(attemptsUsed)) return { kind: 'LIMIT_REACHED' };

    const attempt = await tx.quizAttempt.create({
      data: {
        quizId,
        userId,
        score: grading.score,
        maxScore: grading.maxScore,
        isPassed: grading.isPassed,
        startedAt: now,
        finishedAt: now,
      },
      select: { id: true },
    });

    await tx.quizAttemptAnswer.createMany({
      data: grading.questions.map((question) => ({
        attemptId: attempt.id,
        questionId: question.questionId,
        selectedOptionIds: question.selectedOptionIds,
        isCorrect: question.isCorrect,
      })),
    });

    if (grading.isPassed) {
      await markLessonCompleted(tx, enrollmentId, lessonId, now);
    }

    const decision = await storeEnrollmentProgress(tx, input, decisions.decideProgress);

    return { kind: 'RECORDED', attemptId: attempt.id, attemptsUsed: attemptsUsed + 1, decision };
  });
}

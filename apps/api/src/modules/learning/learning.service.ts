import { ContentType, CourseStatus, LessonType, StorageProvider, UserRole } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { createStreamPlayback } from '../../lib/stream.js';
import { decideCourseAccess, decideLessonAccess } from './lesson-access.js';
import {
  applyFreeEnrollment,
  applyLessonCompletion,
  applyQuizAttempt,
  findActiveEnrollmentId,
  findActiveEnrollmentProgress,
  findCourseForEnrollment,
  findCourseProgram,
  findLessonForLearner,
  findLessonForProgress,
  findMyEnrollments,
  findQuizForGrading,
  hasActiveEnrollment,
  type LessonForLearner,
  type MyEnrollment,
} from './learning.repository.js';
import type { MyEnrollmentsQuery, QuizAttemptBody } from './learning.validation.js';
import {
  decideEnrollmentProgress,
  summarizeProgress,
  type OrderedLesson,
  type ProgressSummary,
} from './progress.js';
import { gradeQuiz, hasAttemptsLeft, shouldRevealCorrectAnswers } from './quiz-grading.js';

export interface LearnerActor {
  userId: string;
  roles: UserRole[];
}

type VideoDto =
  | { status: 'READY'; hlsUrl: string; expiresIn: number; durationSec: number | null }
  | { status: 'PROCESSING' | 'UNAVAILABLE'; hlsUrl: null; expiresIn: null; durationSec: number | null };

/**
 * Extension is derived from the original file name, same convention as the
 * public course endpoint (apps/api/src/modules/courses/course.service.ts) —
 * kept as a local copy rather than an import: courses/ is off-limits here.
 */
function extensionFromName(name: string): string | null {
  const lastDot = name.lastIndexOf('.');

  if (lastDot <= 0 || lastDot === name.length - 1) {
    return null;
  }

  return name.slice(lastDot + 1).toLowerCase();
}

function buildVideo(video: LessonForLearner['video'], lessonDurationSec: number | null): VideoDto | null {
  if (video === null) return null;

  const durationSec = video.durationSec ?? lessonDurationSec;

  if (!video.isReady) {
    return { status: 'PROCESSING', hlsUrl: null, expiresIn: null, durationSec };
  }

  if (video.provider !== StorageProvider.CLOUDFLARE_STREAM) {
    return { status: 'UNAVAILABLE', hlsUrl: null, expiresIn: null, durationSec };
  }

  const playback = createStreamPlayback(video.storageKey, durationSec);

  if (playback === null) {
    return { status: 'UNAVAILABLE', hlsUrl: null, expiresIn: null, durationSec };
  }

  return { status: 'READY', hlsUrl: playback.hlsUrl, expiresIn: playback.expiresIn, durationSec };
}

export async function getLessonForLearner(actor: LearnerActor, lessonId: string) {
  const lesson = await findLessonForLearner(lessonId);

  if (lesson === null) {
    throw AppError.notFound('Lesson not found');
  }

  const isAdmin = actor.roles.includes(UserRole.ADMIN);
  const isCourseAuthor = lesson.module.course.authorId === actor.userId;

  // The enrollment lookup is skipped for an admin or the course author: the
  // outcome cannot change their access, and it is one fewer query on the
  // hottest path (every author previewing their own lesson).
  const activeEnrollment =
    isAdmin || isCourseAuthor ? false : await hasActiveEnrollment(actor.userId, lesson.module.course.id);

  const access = decideLessonAccess({
    isAdmin,
    isCourseAuthor,
    hasActiveEnrollment: activeEnrollment,
    courseStatus: lesson.module.course.status,
    isFreePreview: lesson.isFreePreview,
  });

  if (access === 'NOT_FOUND') {
    throw AppError.notFound('Lesson not found');
  }
  if (access === 'FORBIDDEN') {
    throw AppError.forbidden('You do not have access to this lesson');
  }

  return {
    access,
    lesson: {
      id: lesson.id,
      courseId: lesson.module.course.id,
      moduleId: lesson.module.id,
      type: lesson.type,
      title: lesson.title,
      position: lesson.sortOrder,
      isPreview: lesson.isFreePreview,
      durationSec: lesson.durationSec,
      text: lesson.textContent,
      video: buildVideo(lesson.video, lesson.durationSec),
      materials: lesson.files.map((attachment) => ({
        id: attachment.id,
        fileId: attachment.file.id,
        name: attachment.file.originalName,
        format: extensionFromName(attachment.file.originalName),
        mimeType: attachment.file.mimeType,
        sizeBytes: attachment.file.sizeBytes.toString(),
      })),
      quiz: lesson.quiz
        ? {
            id: lesson.quiz.id,
            title: lesson.quiz.title,
            passScore: lesson.quiz.passScore,
            timeLimitSec: lesson.quiz.timeLimitSec,
            attemptsAllowed: lesson.quiz.attemptsAllowed,
            questions: lesson.quiz.questions.map((question) => ({
              id: question.id,
              type: question.type,
              text: question.text,
              points: question.points,
              position: question.sortOrder,
              options: question.options.map((option) => ({
                id: option.id,
                text: option.text,
                position: option.sortOrder,
              })),
            })),
          }
        : null,
    },
  };
}

/** Local copy of the courses/ helper with the same behavior; that module is off-limits here. */
function publicAssetUrl(storageKey: string): string | null {
  const base = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');

  if (base === undefined || base.length === 0) {
    return null;
  }

  return `${base}/${storageKey.replace(/^\//, '')}`;
}

function toProgressDto(summary: ProgressSummary, completedAt: Date | null) {
  return { ...summary, completedAt };
}

function courseProgressDto(
  orderedLessons: readonly OrderedLesson[],
  completedIds: ReadonlySet<string>,
  completedAt: Date | null,
) {
  return toProgressDto(summarizeProgress(orderedLessons, completedIds), completedAt);
}

function toMaterialsSummary(files: MyEnrollment['course']['courseFiles']) {
  let totalSizeBytes = BigInt(0);
  const formats = new Set<string>();

  for (const { file } of files) {
    totalSizeBytes += file.sizeBytes;
    const format = extensionFromName(file.originalName);
    if (format !== null) formats.add(format);
  }

  return { filesCount: files.length, totalSizeBytes: totalSizeBytes.toString(), formats: [...formats].sort() };
}

function toMyEnrollmentDto(enrollment: MyEnrollment) {
  const { course } = enrollment;
  const isCourse = course.type === ContentType.COURSE;
  const orderedLessons = course.modules.flatMap((learningModule) => learningModule.lessons);
  const completedIds = new Set(enrollment.progress.map((entry) => entry.lessonId));

  return {
    id: enrollment.id,
    source: enrollment.source,
    enrolledAt: enrollment.createdAt,
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      type: course.type,
      status: course.status,
      cover: course.cover ? { url: publicAssetUrl(course.cover.storageKey) } : null,
      category: { id: course.category.id, slug: course.category.slug, name: course.category.nameUk },
      author: {
        id: course.author.id,
        name: course.author.authorProfile?.displayName ?? course.author.fullName,
      },
    },
    progress: isCourse ? courseProgressDto(orderedLessons, completedIds, enrollment.completedAt) : null,
    materials: isCourse ? null : toMaterialsSummary(course.courseFiles),
  };
}

// No pagination: a learner has dozens of enrollments, not thousands.
export async function listMyEnrollments(userId: string, query: MyEnrollmentsQuery) {
  const enrollments = await findMyEnrollments(userId, query.type);

  return { items: enrollments.map(toMyEnrollmentDto) };
}

export async function getCourseProgram(actor: LearnerActor, courseId: string) {
  const course = await findCourseProgram(courseId);

  if (course === null) {
    throw AppError.notFound('Course not found');
  }

  // Always looked up: an admin or the author may also be enrolled, and the
  // enrollment is what carries their progress.
  const enrollment = await findActiveEnrollmentProgress(actor.userId, course.id);

  const access = decideCourseAccess({
    isAdmin: actor.roles.includes(UserRole.ADMIN),
    isCourseAuthor: course.authorId === actor.userId,
    hasActiveEnrollment: enrollment !== null,
    courseStatus: course.status,
  });

  if (access === 'NOT_FOUND') {
    throw AppError.notFound('Course not found');
  }

  const completedIds = new Set(enrollment?.completedLessonIds ?? []);
  const orderedLessons = course.modules.flatMap((learningModule) => learningModule.lessons);

  return {
    access,
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      type: course.type,
      status: course.status,
    },
    progress:
      course.type === ContentType.COURSE && enrollment !== null
        ? courseProgressDto(orderedLessons, completedIds, enrollment.completedAt)
        : null,
    modules: course.modules.map((learningModule) => ({
      id: learningModule.id,
      title: learningModule.title,
      position: learningModule.sortOrder,
      lessons: learningModule.lessons.map((lesson) => ({
        id: lesson.id,
        type: lesson.type,
        title: lesson.title,
        position: lesson.sortOrder,
        isPreview: lesson.isFreePreview,
        durationSec: lesson.durationSec,
        isLocked: access === 'PREVIEW' && !lesson.isFreePreview,
        isCompleted: enrollment !== null && completedIds.has(lesson.id),
      })),
    })),
    materials: course.courseFiles.map((courseFile) => ({
      id: courseFile.id,
      fileId: courseFile.file.id,
      title: courseFile.title,
      name: courseFile.file.originalName,
      format: extensionFromName(courseFile.file.originalName),
      mimeType: courseFile.file.mimeType,
      sizeBytes: courseFile.file.sizeBytes.toString(),
    })),
  };
}

export async function enrollInFreeCourse(actor: LearnerActor, courseId: string) {
  const course = await findCourseForEnrollment(courseId);

  if (course === null || course.status !== CourseStatus.PUBLISHED) {
    throw AppError.notFound('Course not found');
  }
  // Enrolling the author would inflate their own student counters.
  if (course.authorId === actor.userId) {
    throw AppError.conflict('Author cannot enroll in own course');
  }
  // A paid course is opened only by the payment webhook.
  if (course.priceAmount !== 0) {
    throw AppError.conflict('Course is not free');
  }

  const result = await applyFreeEnrollment({ userId: actor.userId, courseId: course.id });

  return {
    enrollment: {
      id: result.enrollment.id,
      source: result.enrollment.source,
      enrolledAt: result.enrollment.createdAt,
    },
    created: result.kind !== 'EXISTS',
  };
}

interface ProgressAccessTarget {
  isFreePreview: boolean;
  course: { id: string; authorId: string; status: CourseStatus };
}

/**
 * Progress and attempts need an active enrollment. Without one the lesson
 * access rule only picks the error: an unpublished course stays invisible
 * (404), everyone else, including the author and an admin who may view but
 * not track progress, gets 403.
 */
async function requireEnrollmentForProgress(actor: LearnerActor, target: ProgressAccessTarget): Promise<string> {
  const enrollmentId = await findActiveEnrollmentId(actor.userId, target.course.id);
  if (enrollmentId !== null) return enrollmentId;

  const access = decideLessonAccess({
    isAdmin: actor.roles.includes(UserRole.ADMIN),
    isCourseAuthor: target.course.authorId === actor.userId,
    hasActiveEnrollment: false,
    courseStatus: target.course.status,
    isFreePreview: target.isFreePreview,
  });

  if (access === 'NOT_FOUND') {
    throw AppError.notFound('Lesson not found');
  }
  throw AppError.forbidden('Progress is tracked only for enrolled learners');
}

export async function completeLesson(actor: LearnerActor, lessonId: string) {
  const lesson = await findLessonForProgress(lessonId);

  if (lesson === null) {
    throw AppError.notFound('Lesson not found');
  }

  const enrollmentId = await requireEnrollmentForProgress(actor, lesson);

  if (lesson.type === LessonType.QUIZ && lesson.hasQuiz) {
    throw AppError.conflict('Quiz lessons are completed by passing the quiz');
  }

  const decision = await applyLessonCompletion(
    { enrollmentId, lessonId: lesson.id, courseId: lesson.course.id, now: new Date() },
    decideEnrollmentProgress,
  );

  return {
    lessonId: lesson.id,
    isCompleted: true,
    progress: toProgressDto(decision.summary, decision.completedAt),
  };
}

export async function submitQuizAttempt(actor: LearnerActor, quizId: string, body: QuizAttemptBody) {
  const quiz = await findQuizForGrading(quizId);

  if (quiz === null) {
    throw AppError.notFound('Quiz not found');
  }

  const course = quiz.lesson.module.course;
  const enrollmentId = await requireEnrollmentForProgress(actor, {
    isFreePreview: quiz.lesson.isFreePreview,
    course,
  });

  if (quiz.questions.length === 0) {
    throw AppError.conflict('Quiz has no questions');
  }

  const grading = gradeQuiz(quiz.questions, body.answers, quiz.passScore);

  if (!grading.ok) {
    throw AppError.validation('Invalid answers', grading.details);
  }

  // timeLimitSec is not enforced here: the attempt arrives in one request and
  // the server never sees when it started, so the limit is a client timer.
  const now = new Date();
  const result = await applyQuizAttempt(
    {
      enrollmentId,
      userId: actor.userId,
      quizId: quiz.id,
      lessonId: quiz.lesson.id,
      courseId: course.id,
      grading,
      now,
    },
    {
      canAttempt: (attemptsUsed) => hasAttemptsLeft(attemptsUsed, quiz.attemptsAllowed),
      decideProgress: decideEnrollmentProgress,
    },
  );

  if (result.kind === 'LIMIT_REACHED') {
    throw AppError.conflict('No attempts left');
  }

  const reveal = shouldRevealCorrectAnswers(grading.isPassed, result.attemptsUsed, quiz.attemptsAllowed);

  return {
    attempt: {
      id: result.attemptId,
      score: grading.score,
      maxScore: grading.maxScore,
      percent: grading.percent,
      passScore: quiz.passScore,
      isPassed: grading.isPassed,
      attemptsUsed: result.attemptsUsed,
      attemptsAllowed: quiz.attemptsAllowed,
      finishedAt: now,
    },
    questions: grading.questions.map((question) => ({
      questionId: question.questionId,
      isCorrect: question.isCorrect,
      selectedOptionIds: question.selectedOptionIds,
      correctOptionIds: reveal ? question.correctOptionIds : null,
    })),
    progress: toProgressDto(result.decision.summary, result.decision.completedAt),
  };
}

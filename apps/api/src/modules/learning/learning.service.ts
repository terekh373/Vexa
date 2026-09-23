import { ContentType, StorageProvider, UserRole } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { createStreamPlayback } from '../../lib/stream.js';
import { decideLessonAccess } from './lesson-access.js';
import {
  findLessonForLearner,
  findMyEnrollments,
  hasActiveEnrollment,
  type LessonForLearner,
  type MyEnrollment,
} from './learning.repository.js';
import type { MyEnrollmentsQuery } from './learning.validation.js';
import { summarizeProgress, type ProgressSummary } from './progress.js';

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
    progress: isCourse ? toProgressDto(summarizeProgress(orderedLessons, completedIds), enrollment.completedAt) : null,
    materials: isCourse ? null : toMaterialsSummary(course.courseFiles),
  };
}

// No pagination: a learner has dozens of enrollments, not thousands.
export async function listMyEnrollments(userId: string, query: MyEnrollmentsQuery) {
  const enrollments = await findMyEnrollments(userId, query.type);

  return { items: enrollments.map(toMyEnrollmentDto) };
}

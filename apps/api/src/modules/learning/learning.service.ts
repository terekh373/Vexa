import { StorageProvider, UserRole } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { createStreamPlayback } from '../../lib/stream.js';
import { decideLessonAccess } from './lesson-access.js';
import { findLessonForLearner, hasActiveEnrollment, type LessonForLearner } from './learning.repository.js';

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

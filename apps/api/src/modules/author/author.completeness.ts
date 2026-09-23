import { ContentType, LessonType } from '@prisma/client';
import type { ErrorDetail } from '../../lib/errors.js';

export interface CompletenessSnapshot {
  type: ContentType;
  lessons: readonly {
    id: string;
    title: string;
    type: LessonType;
    videoReady: boolean;
    quiz: { questions: readonly { id: string; correctOptionsCount: number }[] } | null;
  }[];
  readyCourseFilesCount: number;
}

export function findCompletenessProblems(snapshot: CompletenessSnapshot): ErrorDetail[] {
  const problems: ErrorDetail[] = [];

  if (snapshot.type === ContentType.COURSE && snapshot.lessons.length === 0) {
    problems.push({ field: 'lessons', message: 'Додайте хоча б один урок' });
  }

  for (const lesson of snapshot.lessons) {
    if (lesson.type === LessonType.VIDEO && !lesson.videoReady) {
      problems.push({
        field: `lessons.${lesson.id}.video`,
        message: `Урок «${lesson.title}»: відео не завантажене або ще обробляється`,
      });
    }

    if (lesson.type === LessonType.QUIZ) {
      if (lesson.quiz === null || lesson.quiz.questions.length === 0) {
        problems.push({
          field: `lessons.${lesson.id}.quiz`,
          message: `Урок «${lesson.title}»: додайте тест хоча б з одним питанням`,
        });
      } else {
        for (const question of lesson.quiz.questions) {
          if (question.correctOptionsCount === 0) {
            problems.push({
              field: `lessons.${lesson.id}.quiz.questions.${question.id}`,
              message: `Урок «${lesson.title}»: у питанні немає правильної відповіді`,
            });
          }
        }
      }
    }
  }

  if (snapshot.type === ContentType.MATERIAL && snapshot.readyCourseFilesCount === 0) {
    problems.push({ field: 'courseFiles', message: 'Додайте хоча б один файл матеріалу' });
  }

  return problems;
}

import { ContentType, LessonType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  findCompletenessProblems,
  type CompletenessSnapshot,
} from '../../src/modules/author/author.completeness.js';

type Lesson = CompletenessSnapshot['lessons'][number];

function lesson(overrides: Partial<Lesson> & Pick<Lesson, 'id' | 'type'>): Lesson {
  return { title: 'Тема', videoReady: false, quiz: null, ...overrides };
}

function course(lessons: Lesson[]): CompletenessSnapshot {
  return { type: ContentType.COURSE, lessons, readyCourseFilesCount: 0 };
}

const textLesson = lesson({ id: 't1', type: LessonType.TEXT });

describe('findCompletenessProblems', () => {
  it('requires at least one lesson in a COURSE', () => {
    expect(findCompletenessProblems(course([]))).toEqual([
      { field: 'lessons', message: 'Додайте хоча б один урок' },
    ]);
  });

  it('requires a ready video in a VIDEO lesson', () => {
    const problems = findCompletenessProblems(
      course([lesson({ id: 'v1', type: LessonType.VIDEO, title: 'Вступ' })]),
    );
    expect(problems).toEqual([
      {
        field: 'lessons.v1.video',
        message: 'Урок «Вступ»: відео не завантажене або ще обробляється',
      },
    ]);
  });

  it('requires a quiz in a QUIZ lesson', () => {
    const problems = findCompletenessProblems(
      course([lesson({ id: 'z1', type: LessonType.QUIZ, title: 'Тест 1' })]),
    );
    expect(problems).toEqual([
      {
        field: 'lessons.z1.quiz',
        message: 'Урок «Тест 1»: додайте тест хоча б з одним питанням',
      },
    ]);
  });

  it('requires at least one question in a quiz', () => {
    const problems = findCompletenessProblems(
      course([lesson({ id: 'z1', type: LessonType.QUIZ, quiz: { questions: [] } })]),
    );
    expect(problems.map((problem) => problem.field)).toEqual(['lessons.z1.quiz']);
  });

  it('requires a correct option in every question', () => {
    const problems = findCompletenessProblems(
      course([
        lesson({
          id: 'z1',
          type: LessonType.QUIZ,
          title: 'Тест 1',
          quiz: {
            questions: [
              { id: 'q1', correctOptionsCount: 1 },
              { id: 'q2', correctOptionsCount: 0 },
            ],
          },
        }),
      ]),
    );
    expect(problems).toEqual([
      {
        field: 'lessons.z1.quiz.questions.q2',
        message: 'Урок «Тест 1»: у питанні немає правильної відповіді',
      },
    ]);
  });

  it('requires a ready file in a MATERIAL', () => {
    const problems = findCompletenessProblems({
      type: ContentType.MATERIAL,
      lessons: [],
      readyCourseFilesCount: 0,
    });
    expect(problems).toEqual([{ field: 'courseFiles', message: 'Додайте хоча б один файл матеріалу' }]);
  });

  it('accepts a complete MATERIAL without lessons', () => {
    expect(
      findCompletenessProblems({ type: ContentType.MATERIAL, lessons: [], readyCourseFilesCount: 1 }),
    ).toEqual([]);
  });

  it('accepts a complete COURSE', () => {
    const snapshot = course([
      textLesson,
      lesson({ id: 'v1', type: LessonType.VIDEO, videoReady: true }),
      lesson({
        id: 'z1',
        type: LessonType.QUIZ,
        quiz: { questions: [{ id: 'q1', correctOptionsCount: 2 }] },
      }),
    ]);
    expect(findCompletenessProblems(snapshot)).toEqual([]);
  });

  it('reports problems in lesson order', () => {
    const problems = findCompletenessProblems(
      course([
        lesson({ id: 'a', type: LessonType.QUIZ }),
        textLesson,
        lesson({ id: 'b', type: LessonType.VIDEO }),
        lesson({
          id: 'c',
          type: LessonType.QUIZ,
          quiz: { questions: [{ id: 'q1', correctOptionsCount: 0 }] },
        }),
      ]),
    );
    expect(problems.map((problem) => problem.field)).toEqual([
      'lessons.a.quiz',
      'lessons.b.video',
      'lessons.c.quiz.questions.q1',
    ]);
  });
});

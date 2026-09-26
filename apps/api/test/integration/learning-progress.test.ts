import { randomUUID } from 'node:crypto';
import {
  ContentType,
  CourseStatus,
  EnrollmentSource,
  LessonType,
  ProgressStatus,
  QuestionType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

const app = createApp();
const CATEGORY_SLUG = 'learning-progress-category';

interface QuestionIds {
  id: string;
  correct: string[];
  wrong: string;
}

interface Fixture {
  studentId: string;
  student2Id: string;
  authorId: string;
  courseA: string;
  courseB: string;
  courseF: string;
  courseG: string;
  l1: string;
  l2: string;
  l3: string;
  lb: string;
  lf: string;
  lg: string;
  quizT1: string;
  quizT2: string;
  t1Single: QuestionIds;
  t1Multiple: QuestionIds;
  t2Single: QuestionIds;
  authorToken: string;
  studentToken: string;
  student2Token: string;
  outsiderToken: string;
}

async function resetState(): Promise<void> {
  // Enrollment -> Course is onDelete: Restrict, so enrollments go first;
  // deleting Course cascades modules, lessons, quizzes and progress, and
  // deleting User cascades quiz attempts and the author profile.
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixture(): Promise<Fixture> {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Категорія прогресу' },
  });

  const makeUser = (label: string, roles: UserRole[]) =>
    prisma.user.create({
      data: { email: `progress-${label}-${randomUUID()}@example.com`, fullName: `Progress ${label}`, roles },
    });

  const author = await makeUser('author', [UserRole.STUDENT, UserRole.AUTHOR]);
  const student = await makeUser('student', [UserRole.STUDENT]);
  const student2 = await makeUser('student2', [UserRole.STUDENT]);
  const outsider = await makeUser('outsider', [UserRole.STUDENT]);

  await prisma.authorProfile.create({ data: { userId: author.id, displayName: 'Progress Author' } });

  const makeCourse = (title: string, priceAmount: number, status: CourseStatus) =>
    prisma.course.create({
      data: {
        authorId: author.id,
        categoryId: category.id,
        type: ContentType.COURSE,
        status,
        slug: `progress-${randomUUID()}`,
        title,
        shortDescription: 'Короткий опис',
        description: 'Повний опис',
        priceAmount,
        publishedAt: new Date(),
      },
    });

  const courseA = await makeCourse('Курс A', 1000, CourseStatus.PUBLISHED);
  const courseB = await makeCourse('Курс B', 1000, CourseStatus.PUBLISHED);
  const courseF = await makeCourse('Курс F', 0, CourseStatus.PUBLISHED);
  const courseG = await makeCourse('Курс G', 0, CourseStatus.DRAFT);

  const makeModule = (courseId: string) => prisma.module.create({ data: { courseId, title: 'M', sortOrder: 0 } });
  const moduleA = await makeModule(courseA.id);
  const moduleB = await makeModule(courseB.id);
  const moduleF = await makeModule(courseF.id);
  const moduleG = await makeModule(courseG.id);

  const makeLesson = (moduleId: string, type: LessonType, title: string, sortOrder: number) =>
    prisma.lesson.create({
      data: { moduleId, type, title, sortOrder, textContent: type === LessonType.TEXT ? 'body' : null },
    });

  const l1 = await makeLesson(moduleA.id, LessonType.VIDEO, 'L1', 0);
  const l2 = await makeLesson(moduleA.id, LessonType.TEXT, 'L2', 1);
  const l3 = await makeLesson(moduleA.id, LessonType.QUIZ, 'L3', 2);
  const lb = await makeLesson(moduleB.id, LessonType.QUIZ, 'LB', 0);
  const lf = await makeLesson(moduleF.id, LessonType.TEXT, 'LF', 0);
  const lg = await makeLesson(moduleG.id, LessonType.TEXT, 'LG', 0);

  const makeQuestion = async (
    quizId: string,
    type: QuestionType,
    sortOrder: number,
    correctCount: number,
  ): Promise<QuestionIds> => {
    const question = await prisma.question.create({
      data: { quizId, type, text: `Питання ${sortOrder}`, points: 1, sortOrder },
    });
    const correct: string[] = [];
    for (let index = 0; index < correctCount; index += 1) {
      const option = await prisma.answerOption.create({
        data: { questionId: question.id, text: `Вірно ${index}`, isCorrect: true, sortOrder: index },
      });
      correct.push(option.id);
    }
    const wrong = await prisma.answerOption.create({
      data: { questionId: question.id, text: 'Невірно', isCorrect: false, sortOrder: correctCount },
    });
    return { id: question.id, correct, wrong: wrong.id };
  };

  const t1 = await prisma.quiz.create({
    data: { lessonId: l3.id, title: 'T1', passScore: 60, attemptsAllowed: null },
  });
  const t1Single = await makeQuestion(t1.id, QuestionType.SINGLE, 0, 1);
  const t1Multiple = await makeQuestion(t1.id, QuestionType.MULTIPLE, 1, 2);

  const t2 = await prisma.quiz.create({
    data: { lessonId: lb.id, title: 'T2', passScore: 60, attemptsAllowed: 2 },
  });
  const t2Single = await makeQuestion(t2.id, QuestionType.SINGLE, 0, 1);

  return {
    studentId: student.id,
    student2Id: student2.id,
    authorId: author.id,
    courseA: courseA.id,
    courseB: courseB.id,
    courseF: courseF.id,
    courseG: courseG.id,
    l1: l1.id,
    l2: l2.id,
    l3: l3.id,
    lb: lb.id,
    lf: lf.id,
    lg: lg.id,
    quizT1: t1.id,
    quizT2: t2.id,
    t1Single,
    t1Multiple,
    t2Single,
    authorToken: signAccessToken(author.id, author.roles),
    studentToken: signAccessToken(student.id, student.roles),
    student2Token: signAccessToken(student2.id, student2.roles),
    outsiderToken: signAccessToken(outsider.id, outsider.roles),
  };
}

function bearer(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}

function enrollPath(courseId: string): string {
  return `/api/learn/courses/${courseId}/enroll`;
}

function completePath(lessonId: string): string {
  return `/api/learn/lessons/${lessonId}/complete`;
}

function attemptsPath(quizId: string): string {
  return `/api/learn/quizzes/${quizId}/attempts`;
}

function answer(question: QuestionIds, optionIds: string[]) {
  return { questionId: question.id, optionIds };
}

describe('enrollment, lesson progress and quiz attempts integration', () => {
  let fixture: Fixture;

  beforeAll(async () => {
    await resetState();
    fixture = await seedFixture();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('POST /api/learn/courses/:courseId/enroll', () => {
    it('requires authentication and rejects a paid, missing or draft course', async () => {
      const anonymous = await request(app).post(enrollPath(fixture.courseF));
      expect(anonymous.status).toBe(401);

      const paid = await request(app).post(enrollPath(fixture.courseA)).set(...bearer(fixture.outsiderToken));
      expect(paid.status).toBe(409);

      const draft = await request(app).post(enrollPath(fixture.courseG)).set(...bearer(fixture.outsiderToken));
      expect(draft.status).toBe(404);

      const missing = await request(app).post(enrollPath(randomUUID())).set(...bearer(fixture.outsiderToken));
      expect(missing.status).toBe(404);

      const invalid = await request(app).post(enrollPath('nope')).set(...bearer(fixture.outsiderToken));
      expect(invalid.status).toBe(400);
    });

    it('does not let the author enroll in their own course', async () => {
      const response = await request(app).post(enrollPath(fixture.courseF)).set(...bearer(fixture.authorToken));
      expect(response.status).toBe(409);
    });

    it('enrolls a learner for free and recounts the counters', async () => {
      const response = await request(app).post(enrollPath(fixture.courseF)).set(...bearer(fixture.outsiderToken));
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ created: true, enrollment: { source: 'FREE' } });

      const course = await prisma.course.findUniqueOrThrow({ where: { id: fixture.courseF } });
      expect(course.studentsCount).toBe(1);
      const profile = await prisma.authorProfile.findUniqueOrThrow({ where: { userId: fixture.authorId } });
      expect(profile.studentsCount).toBe(1);
    });

    it('is idempotent for a repeated enrollment', async () => {
      const response = await request(app).post(enrollPath(fixture.courseF)).set(...bearer(fixture.outsiderToken));
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ created: false, enrollment: { source: 'FREE' } });

      const course = await prisma.course.findUniqueOrThrow({ where: { id: fixture.courseF } });
      expect(course.studentsCount).toBe(1);
      const profile = await prisma.authorProfile.findUniqueOrThrow({ where: { userId: fixture.authorId } });
      expect(profile.studentsCount).toBe(1);
    });

    it('creates one enrollment for two parallel requests', async () => {
      const [first, second] = await Promise.all([
        request(app).post(enrollPath(fixture.courseF)).set(...bearer(fixture.student2Token)),
        request(app).post(enrollPath(fixture.courseF)).set(...bearer(fixture.student2Token)),
      ]);

      expect([first.status, second.status].sort()).toEqual([200, 201]);
      const rows = await prisma.enrollment.count({
        where: { userId: fixture.student2Id, courseId: fixture.courseF },
      });
      expect(rows).toBe(1);

      const course = await prisma.course.findUniqueOrThrow({ where: { id: fixture.courseF } });
      expect(course.studentsCount).toBe(2);
    });

    it('opens the lesson of the free course for the enrolled learner', async () => {
      const response = await request(app)
        .get(`/api/learn/lessons/${fixture.lf}`)
        .set(...bearer(fixture.outsiderToken));
      expect(response.status).toBe(200);
      expect(response.body.access).toBe('ENROLLED');
    });
  });

  // The learner and the second learner are enrolled in the paid courses only
  // now: the counters checked above must not include them.
  describe('POST /api/learn/lessons/:lessonId/complete', () => {
    beforeAll(async () => {
      await prisma.enrollment.createMany({
        data: [
          { userId: fixture.studentId, courseId: fixture.courseA, source: EnrollmentSource.PURCHASE },
          { userId: fixture.studentId, courseId: fixture.courseB, source: EnrollmentSource.PURCHASE },
          { userId: fixture.student2Id, courseId: fixture.courseB, source: EnrollmentSource.PURCHASE },
        ],
      });
    });

    it('requires authentication and a valid id', async () => {
      const anonymous = await request(app).post(completePath(fixture.l1));
      expect(anonymous.status).toBe(401);

      const invalid = await request(app).post(completePath('nope')).set(...bearer(fixture.studentToken));
      expect(invalid.status).toBe(400);

      const missing = await request(app).post(completePath(randomUUID())).set(...bearer(fixture.studentToken));
      expect(missing.status).toBe(404);
    });

    it('rejects learners without an active enrollment', async () => {
      const outsider = await request(app).post(completePath(fixture.l1)).set(...bearer(fixture.outsiderToken));
      expect(outsider.status).toBe(403);

      const author = await request(app).post(completePath(fixture.l1)).set(...bearer(fixture.authorToken));
      expect(author.status).toBe(403);

      const hiddenCourse = await request(app).post(completePath(fixture.lg)).set(...bearer(fixture.outsiderToken));
      expect(hiddenCourse.status).toBe(404);
    });

    it('does not complete a quiz lesson by hand', async () => {
      const response = await request(app).post(completePath(fixture.l3)).set(...bearer(fixture.studentToken));
      expect(response.status).toBe(409);
    });

    it('marks a lesson completed and stores the enrollment progress', async () => {
      const response = await request(app).post(completePath(fixture.l1)).set(...bearer(fixture.studentToken));
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        lessonId: fixture.l1,
        isCompleted: true,
        progress: {
          state: 'IN_PROGRESS',
          percent: 33,
          completedLessons: 1,
          totalLessons: 3,
          continueLesson: { id: fixture.l2 },
          completedAt: null,
        },
      });

      const enrollment = await prisma.enrollment.findFirstOrThrow({
        where: { userId: fixture.studentId, courseId: fixture.courseA },
      });
      expect(enrollment.progressPercent).toBe(33);
      expect(enrollment.lastLessonId).toBe(fixture.l1);
    });

    it('keeps the completion date when the mark is repeated', async () => {
      const enrollment = await prisma.enrollment.findFirstOrThrow({
        where: { userId: fixture.studentId, courseId: fixture.courseA },
      });
      const before = await prisma.lessonProgress.findFirstOrThrow({
        where: { enrollmentId: enrollment.id, lessonId: fixture.l1 },
      });

      const response = await request(app).post(completePath(fixture.l1)).set(...bearer(fixture.studentToken));
      expect(response.status).toBe(200);
      expect(response.body.progress).toMatchObject({ percent: 33, completedLessons: 1 });

      const after = await prisma.lessonProgress.findFirstOrThrow({
        where: { enrollmentId: enrollment.id, lessonId: fixture.l1 },
      });
      expect(after.status).toBe(ProgressStatus.COMPLETED);
      expect(after.completedAt?.getTime()).toBe(before.completedAt?.getTime());
    });
  });

  describe('POST /api/learn/quizzes/:quizId/attempts on a quiz without an attempt limit', () => {
    it('requires authentication, access and a valid body', async () => {
      const anonymous = await request(app).post(attemptsPath(fixture.quizT1)).send({ answers: [] });
      expect(anonymous.status).toBe(401);

      const outsider = await request(app)
        .post(attemptsPath(fixture.quizT1))
        .set(...bearer(fixture.outsiderToken))
        .send({ answers: [] });
      expect(outsider.status).toBe(403);

      const missing = await request(app)
        .post(attemptsPath(randomUUID()))
        .set(...bearer(fixture.studentToken))
        .send({ answers: [] });
      expect(missing.status).toBe(404);

      const badBody = await request(app)
        .post(attemptsPath(fixture.quizT1))
        .set(...bearer(fixture.studentToken))
        .send({ answers: 'nope' });
      expect(badBody.status).toBe(400);

      const extraKey = await request(app)
        .post(attemptsPath(fixture.quizT1))
        .set(...bearer(fixture.studentToken))
        .send({ answers: [], extra: true });
      expect(extraKey.status).toBe(400);
    });

    it('rejects an option that belongs to another question', async () => {
      const response = await request(app)
        .post(attemptsPath(fixture.quizT1))
        .set(...bearer(fixture.studentToken))
        .send({ answers: [answer(fixture.t1Single, [fixture.t1Multiple.wrong])] });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual([
        { field: 'answers.0.optionIds.0', message: 'Option does not belong to this question' },
      ]);
    });

    it('records a failed attempt without revealing the answers', async () => {
      const response = await request(app)
        .post(attemptsPath(fixture.quizT1))
        .set(...bearer(fixture.studentToken))
        .send({
          answers: [answer(fixture.t1Single, [fixture.t1Single.wrong]), answer(fixture.t1Multiple, fixture.t1Multiple.correct)],
        });

      expect(response.status).toBe(201);
      expect(response.body.attempt).toMatchObject({
        score: 1,
        maxScore: 2,
        percent: 50,
        passScore: 60,
        isPassed: false,
        attemptsUsed: 1,
        attemptsAllowed: null,
      });
      expect(response.body.questions).toHaveLength(2);
      expect(response.body.questions).toMatchObject([
        { questionId: fixture.t1Single.id, isCorrect: false, correctOptionIds: null },
        { questionId: fixture.t1Multiple.id, isCorrect: true, correctOptionIds: null },
      ]);

      const lessonProgress = await prisma.lessonProgress.count({
        where: { lessonId: fixture.l3, status: ProgressStatus.COMPLETED },
      });
      expect(lessonProgress).toBe(0);

      const answers = await prisma.quizAttemptAnswer.count({ where: { attemptId: response.body.attempt.id } });
      expect(answers).toBe(2);
    });

    it('passes the lesson with a successful attempt and reveals the answers', async () => {
      const response = await request(app)
        .post(attemptsPath(fixture.quizT1))
        .set(...bearer(fixture.studentToken))
        .send({
          answers: [
            answer(fixture.t1Single, fixture.t1Single.correct),
            answer(fixture.t1Multiple, [...fixture.t1Multiple.correct].reverse()),
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.attempt).toMatchObject({ isPassed: true, percent: 100, attemptsUsed: 2 });
      expect(response.body.questions).toMatchObject([
        { isCorrect: true, correctOptionIds: fixture.t1Single.correct },
        { isCorrect: true, correctOptionIds: [...fixture.t1Multiple.correct].sort() },
      ]);
      expect(response.body.progress).toMatchObject({ completedLessons: 2, totalLessons: 3, percent: 66 });

      const lessonProgress = await prisma.lessonProgress.count({
        where: { lessonId: fixture.l3, status: ProgressStatus.COMPLETED },
      });
      expect(lessonProgress).toBe(1);
    });

    it('completes the course once every lesson is done and keeps the first date', async () => {
      const last = await request(app).post(completePath(fixture.l2)).set(...bearer(fixture.studentToken));
      expect(last.status).toBe(200);
      expect(last.body.progress).toMatchObject({ state: 'COMPLETED', percent: 100, continueLesson: null });

      const completed = await prisma.enrollment.findFirstOrThrow({
        where: { userId: fixture.studentId, courseId: fixture.courseA },
      });
      expect(completed.completedAt).not.toBeNull();
      expect(completed.progressPercent).toBe(100);

      const repeat = await request(app).post(completePath(fixture.l1)).set(...bearer(fixture.studentToken));
      expect(repeat.status).toBe(200);

      const after = await prisma.enrollment.findFirstOrThrow({
        where: { userId: fixture.studentId, courseId: fixture.courseA },
      });
      expect(after.completedAt?.getTime()).toBe(completed.completedAt?.getTime());
    });
  });

  describe('POST /api/learn/quizzes/:quizId/attempts on a quiz with two attempts', () => {
    it('reveals the answers only when the attempts are exhausted', async () => {
      const wrongAnswers = { answers: [answer(fixture.t2Single, [fixture.t2Single.wrong])] };

      const first = await request(app)
        .post(attemptsPath(fixture.quizT2))
        .set(...bearer(fixture.studentToken))
        .send(wrongAnswers);
      expect(first.status).toBe(201);
      expect(first.body.attempt).toMatchObject({ isPassed: false, attemptsUsed: 1, attemptsAllowed: 2 });
      expect(first.body.questions).toMatchObject([{ correctOptionIds: null }]);

      const second = await request(app)
        .post(attemptsPath(fixture.quizT2))
        .set(...bearer(fixture.studentToken))
        .send(wrongAnswers);
      expect(second.status).toBe(201);
      expect(second.body.attempt).toMatchObject({ isPassed: false, attemptsUsed: 2 });
      expect(second.body.questions).toMatchObject([{ correctOptionIds: fixture.t2Single.correct }]);

      const third = await request(app)
        .post(attemptsPath(fixture.quizT2))
        .set(...bearer(fixture.studentToken))
        .send(wrongAnswers);
      expect(third.status).toBe(409);
    });

    it('does not exceed the limit under parallel requests', async () => {
      await prisma.quizAttempt.create({
        data: { quizId: fixture.quizT2, userId: fixture.student2Id, score: 0, maxScore: 1, finishedAt: new Date() },
      });

      const wrongAnswers = { answers: [answer(fixture.t2Single, [fixture.t2Single.wrong])] };
      const [first, second] = await Promise.all([
        request(app).post(attemptsPath(fixture.quizT2)).set(...bearer(fixture.student2Token)).send(wrongAnswers),
        request(app).post(attemptsPath(fixture.quizT2)).set(...bearer(fixture.student2Token)).send(wrongAnswers),
      ]);

      expect([first.status, second.status].sort()).toEqual([201, 409]);
      const attempts = await prisma.quizAttempt.count({
        where: { quizId: fixture.quizT2, userId: fixture.student2Id },
      });
      expect(attempts).toBe(2);
    });
  });
});

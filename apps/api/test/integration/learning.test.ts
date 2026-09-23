import { randomUUID } from 'node:crypto';
import {
  ContentType,
  CourseStatus,
  EnrollmentSource,
  FileKind,
  LessonType,
  QuestionType,
  StorageProvider,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

const app = createApp();
const CATEGORY_SLUG = 'learning-integration-category';

interface Fixture {
  courseId: string;
  previewLessonId: string;
  paidLessonId: string;
  quizLessonId: string;
  attachmentFileId: string;
  authorToken: string;
  enrolledToken: string;
  revokedToken: string;
  outsiderToken: string;
  adminToken: string;
}

async function resetState(): Promise<void> {
  // Enrollment -> Course is onDelete: Restrict, so enrollments must go first.
  // Deleting Course then cascades Module -> Lesson -> LessonFile/Quiz/Question/
  // AnswerOption, which frees the File rows for a plain delete afterwards.
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixture(): Promise<Fixture> {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Тестова категорія навчання' },
  });

  const author = await prisma.user.create({
    data: {
      email: `learning-author-${randomUUID()}@example.com`,
      fullName: 'Learning Author',
      roles: [UserRole.STUDENT, UserRole.AUTHOR],
    },
  });
  const enrolledStudent = await prisma.user.create({
    data: {
      email: `learning-enrolled-${randomUUID()}@example.com`,
      fullName: 'Enrolled Student',
      roles: [UserRole.STUDENT],
    },
  });
  const revokedStudent = await prisma.user.create({
    data: {
      email: `learning-revoked-${randomUUID()}@example.com`,
      fullName: 'Revoked Student',
      roles: [UserRole.STUDENT],
    },
  });
  const outsider = await prisma.user.create({
    data: {
      email: `learning-outsider-${randomUUID()}@example.com`,
      fullName: 'Outsider Student',
      roles: [UserRole.STUDENT],
    },
  });
  const admin = await prisma.user.create({
    data: {
      email: `learning-admin-${randomUUID()}@example.com`,
      fullName: 'Learning Admin',
      roles: [UserRole.ADMIN],
    },
  });

  await prisma.authorProfile.create({
    data: { userId: author.id, displayName: 'Learning Author' },
  });

  const course = await prisma.course.create({
    data: {
      authorId: author.id,
      categoryId: category.id,
      type: ContentType.COURSE,
      status: CourseStatus.PUBLISHED,
      slug: `learning-course-${randomUUID()}`,
      title: 'Курс для тесту доступу до уроків',
      shortDescription: 'Короткий опис',
      description: 'Повний опис',
      priceAmount: 20_000,
      publishedAt: new Date(),
    },
  });

  const learningModule = await prisma.module.create({
    data: { courseId: course.id, title: 'Модуль 1', sortOrder: 0 },
  });

  const videoFile = await prisma.file.create({
    data: {
      uploadedById: author.id,
      kind: FileKind.VIDEO,
      provider: StorageProvider.CLOUDFLARE_STREAM,
      storageKey: `cf-stream-uid-${randomUUID()}`,
      originalName: 'intro.mp4',
      mimeType: 'video/mp4',
      sizeBytes: BigInt(10_485_760),
      durationSec: 120,
      isReady: true,
    },
  });

  const attachmentFile = await prisma.file.create({
    data: {
      uploadedById: author.id,
      kind: FileKind.ATTACHMENT,
      provider: StorageProvider.S3,
      storageKey: `attachment/${randomUUID()}.pdf`,
      originalName: 'Конспект.pdf',
      mimeType: 'application/pdf',
      sizeBytes: BigInt(1_204_224),
      isReady: true,
    },
  });

  const previewLesson = await prisma.lesson.create({
    data: {
      moduleId: learningModule.id,
      type: LessonType.VIDEO,
      title: 'Безкоштовне прев\'ю',
      sortOrder: 0,
      isFreePreview: true,
      videoFileId: videoFile.id,
      durationSec: 120,
    },
  });

  const paidLesson = await prisma.lesson.create({
    data: {
      moduleId: learningModule.id,
      type: LessonType.TEXT,
      title: 'Платний текстовий урок',
      sortOrder: 1,
      isFreePreview: false,
      textContent: 'Повний текст платного уроку',
    },
  });

  await prisma.lessonFile.create({
    data: { lessonId: paidLesson.id, fileId: attachmentFile.id, sortOrder: 0 },
  });

  const quizLesson = await prisma.lesson.create({
    data: {
      moduleId: learningModule.id,
      type: LessonType.QUIZ,
      title: 'Тест',
      sortOrder: 2,
      isFreePreview: false,
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      lessonId: quizLesson.id,
      title: 'Підсумковий тест',
      passScore: 60,
      timeLimitSec: 600,
      attemptsAllowed: 3,
    },
  });

  const question = await prisma.question.create({
    data: {
      quizId: quiz.id,
      type: QuestionType.SINGLE,
      text: 'Скільки буде 2 + 2?',
      points: 1,
      sortOrder: 0,
    },
  });

  await prisma.answerOption.createMany({
    data: [
      { questionId: question.id, text: '4', isCorrect: true, sortOrder: 0 },
      { questionId: question.id, text: '5', isCorrect: false, sortOrder: 1 },
    ],
  });

  await prisma.enrollment.createMany({
    data: [
      { userId: enrolledStudent.id, courseId: course.id, source: EnrollmentSource.PURCHASE, revokedAt: null },
      { userId: revokedStudent.id, courseId: course.id, source: EnrollmentSource.PURCHASE, revokedAt: new Date() },
    ],
  });

  return {
    courseId: course.id,
    previewLessonId: previewLesson.id,
    paidLessonId: paidLesson.id,
    quizLessonId: quizLesson.id,
    attachmentFileId: attachmentFile.id,
    authorToken: signAccessToken(author.id, author.roles),
    enrolledToken: signAccessToken(enrolledStudent.id, enrolledStudent.roles),
    revokedToken: signAccessToken(revokedStudent.id, revokedStudent.roles),
    outsiderToken: signAccessToken(outsider.id, outsider.roles),
    adminToken: signAccessToken(admin.id, admin.roles),
  };
}

describe('lesson content integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('requires authentication', async () => {
    const fixture = await seedFixture();

    const response = await request(app).get(`/api/learn/lessons/${fixture.paidLessonId}`);
    expect(response.status).toBe(401);
  });

  it('rejects an invalid lessonId with 400', async () => {
    const fixture = await seedFixture();

    const response = await request(app)
      .get('/api/learn/lessons/not-a-uuid')
      .set('Authorization', `Bearer ${fixture.outsiderToken}`);
    expect(response.status).toBe(400);
  });

  it('answers 404 for a lesson that does not exist', async () => {
    const fixture = await seedFixture();

    const response = await request(app)
      .get(`/api/learn/lessons/${randomUUID()}`)
      .set('Authorization', `Bearer ${fixture.outsiderToken}`);
    expect(response.status).toBe(404);
  });

  it('blocks an outsider from a paid lesson but allows the free preview', async () => {
    const fixture = await seedFixture();

    const paid = await request(app)
      .get(`/api/learn/lessons/${fixture.paidLessonId}`)
      .set('Authorization', `Bearer ${fixture.outsiderToken}`);
    expect(paid.status).toBe(403);

    const preview = await request(app)
      .get(`/api/learn/lessons/${fixture.previewLessonId}`)
      .set('Authorization', `Bearer ${fixture.outsiderToken}`);
    expect(preview.status).toBe(200);
    expect(preview.body.access).toBe('PREVIEW');

    // Signing key is not configured in the test environment, so a lesson
    // with a CLOUDFLARE_STREAM video always reports UNAVAILABLE here.
    expect(preview.body.lesson.video).toMatchObject({ status: 'UNAVAILABLE', hlsUrl: null, expiresIn: null });
  });

  it('treats a revoked enrollment as no access', async () => {
    const fixture = await seedFixture();

    const response = await request(app)
      .get(`/api/learn/lessons/${fixture.paidLessonId}`)
      .set('Authorization', `Bearer ${fixture.revokedToken}`);
    expect(response.status).toBe(403);
  });

  it('gives an enrolled student the full lesson content without leaking isCorrect', async () => {
    const fixture = await seedFixture();

    const paid = await request(app)
      .get(`/api/learn/lessons/${fixture.paidLessonId}`)
      .set('Authorization', `Bearer ${fixture.enrolledToken}`);
    expect(paid.status).toBe(200);
    expect(paid.body.access).toBe('ENROLLED');
    expect(paid.body.lesson.text).toBe('Повний текст платного уроку');
    expect(paid.body.lesson.materials).toHaveLength(1);
    expect(paid.body.lesson.materials[0]).toMatchObject({
      fileId: fixture.attachmentFileId,
      name: 'Конспект.pdf',
      format: 'pdf',
      mimeType: 'application/pdf',
      sizeBytes: '1204224',
    });

    const quiz = await request(app)
      .get(`/api/learn/lessons/${fixture.quizLessonId}`)
      .set('Authorization', `Bearer ${fixture.enrolledToken}`);
    expect(quiz.status).toBe(200);
    expect(quiz.body.lesson.quiz).not.toBeNull();
    expect(quiz.body.lesson.quiz.questions[0].options).toHaveLength(2);
    expect(JSON.stringify(quiz.body)).not.toContain('isCorrect');
  });

  it('grants the course author and an admin full access regardless of enrollment', async () => {
    const fixture = await seedFixture();

    const asAuthor = await request(app)
      .get(`/api/learn/lessons/${fixture.paidLessonId}`)
      .set('Authorization', `Bearer ${fixture.authorToken}`);
    expect(asAuthor.status).toBe(200);
    expect(asAuthor.body.access).toBe('AUTHOR');

    const asAdmin = await request(app)
      .get(`/api/learn/lessons/${fixture.paidLessonId}`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.access).toBe('ADMIN');
  });

  it('keeps enrolled access after the course is unpublished, but hides the preview from outsiders', async () => {
    const fixture = await seedFixture();

    await prisma.course.update({
      where: { id: fixture.courseId },
      data: { status: CourseStatus.UNPUBLISHED },
    });

    const outsiderPreview = await request(app)
      .get(`/api/learn/lessons/${fixture.previewLessonId}`)
      .set('Authorization', `Bearer ${fixture.outsiderToken}`);
    expect(outsiderPreview.status).toBe(404);

    const enrolledPaid = await request(app)
      .get(`/api/learn/lessons/${fixture.paidLessonId}`)
      .set('Authorization', `Bearer ${fixture.enrolledToken}`);
    expect(enrolledPaid.status).toBe(200);
    expect(enrolledPaid.body.access).toBe('ENROLLED');
  });

  it('gates the download-url of a paid lesson attachment the same way', async () => {
    const fixture = await seedFixture();

    const outsiderDownload = await request(app)
      .get(`/api/files/${fixture.attachmentFileId}/download-url`)
      .set('Authorization', `Bearer ${fixture.outsiderToken}`);
    expect(outsiderDownload.status).toBe(403);

    const enrolledDownload = await request(app)
      .get(`/api/files/${fixture.attachmentFileId}/download-url`)
      .set('Authorization', `Bearer ${fixture.enrolledToken}`);
    expect(enrolledDownload.status).toBe(200);
    expect(typeof enrolledDownload.body.downloadUrl).toBe('string');
  });
});

import {
  ContentType,
  CourseStatus,
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
const CATEGORY_SLUG = 'author-material-category';
const AUTHOR_EMAIL = 'author-material@example.com';
const OTHER_AUTHOR_EMAIL = 'author-material-other@example.com';
const RANDOM_UUID = '00000000-0000-4000-8000-000000000000';

async function resetState(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { in: [AUTHOR_EMAIL, OTHER_AUTHOR_EMAIL] } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  if (userIds.length > 0) {
    // Deleting a Course cascades to Module -> Lesson -> Quiz and to CourseFile,
    // which frees the File rows for the plain delete below.
    const courses = await prisma.course.findMany({
      where: { authorId: { in: userIds } },
      select: { id: true },
    });
    const courseIds = courses.map((course) => course.id);
    await prisma.moderationLog.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await prisma.file.deleteMany({ where: { uploadedById: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

let courseCounter = 0;

async function seedFixture() {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Матеріали автора' },
  });
  const author = await prisma.user.create({
    data: {
      email: AUTHOR_EMAIL,
      fullName: 'Author Material',
      roles: [UserRole.STUDENT, UserRole.AUTHOR],
    },
  });
  const otherAuthor = await prisma.user.create({
    data: { email: OTHER_AUTHOR_EMAIL, fullName: 'Other Author', roles: [UserRole.AUTHOR] },
  });

  async function createFile(
    ownerId: string,
    kind: FileKind,
    name: string,
    isReady = true,
  ) {
    return prisma.file.create({
      data: {
        uploadedById: ownerId,
        kind,
        provider: kind === FileKind.VIDEO ? StorageProvider.CLOUDFLARE_STREAM : StorageProvider.S3,
        storageKey: `author-material/${courseCounter}-${name}`,
        originalName: name,
        mimeType: kind === FileKind.VIDEO ? 'video/mp4' : 'application/pdf',
        sizeBytes: BigInt(1024),
        isReady,
      },
    });
  }

  const files = {
    first: await createFile(author.id, FileKind.ATTACHMENT, 'first.pdf'),
    second: await createFile(author.id, FileKind.ATTACHMENT, 'second.pdf'),
    cover: await createFile(author.id, FileKind.COVER, 'cover.png'),
    notReady: await createFile(author.id, FileKind.ATTACHMENT, 'processing.pdf', false),
    foreign: await createFile(otherAuthor.id, FileKind.ATTACHMENT, 'foreign.pdf'),
    video: await createFile(author.id, FileKind.VIDEO, 'video.mp4'),
    videoNotReady: await createFile(author.id, FileKind.VIDEO, 'processing.mp4', false),
  };

  async function createCourse(type: ContentType, status: CourseStatus = CourseStatus.DRAFT) {
    courseCounter += 1;
    return prisma.course.create({
      data: {
        authorId: author.id,
        categoryId: category.id,
        type,
        status,
        slug: `author-material-course-${courseCounter}`,
        title: `Курс ${courseCounter}`,
        shortDescription: 'Короткий опис',
        description: 'Повний опис',
      },
    });
  }

  async function createLesson(courseId: string, type: LessonType, videoFileId?: string) {
    const module = await prisma.module.create({
      data: { courseId, title: 'Модуль', sortOrder: 0 },
    });
    return prisma.lesson.create({
      data: {
        moduleId: module.id,
        type,
        title: 'Урок',
        sortOrder: 0,
        ...(videoFileId === undefined ? {} : { videoFileId }),
      },
    });
  }

  return {
    files,
    createCourse,
    createLesson,
    authorToken: signAccessToken(author.id, author.roles),
    otherToken: signAccessToken(otherAuthor.id, otherAuthor.roles),
  };
}

function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

describe('author material files and submit checks', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('material files', () => {
    it('rejects attaching files to a COURSE', async () => {
      const fx = await seedFixture();
      const course = await fx.createCourse(ContentType.COURSE);

      const res = await request(app)
        .post(`/api/author/courses/${course.id}/files`)
        .set(auth(fx.authorToken))
        .send({ fileId: fx.files.first.id, title: 'Файл' });

      expect(res.status).toBe(409);
    });

    it('attaches only own, ready ATTACHMENT files, once each, in order', async () => {
      const fx = await seedFixture();
      const material = await fx.createCourse(ContentType.MATERIAL);
      const url = `/api/author/courses/${material.id}/files`;

      for (const file of [fx.files.foreign, fx.files.cover, fx.files.notReady]) {
        const rejected = await request(app)
          .post(url)
          .set(auth(fx.authorToken))
          .send({ fileId: file.id, title: 'Файл' });
        expect(rejected.status).toBe(404);
      }

      const first = await request(app)
        .post(url)
        .set(auth(fx.authorToken))
        .send({ fileId: fx.files.first.id, title: '  Конспект  ' });
      expect(first.status).toBe(201);
      expect(first.body).toEqual({
        id: expect.any(String),
        fileId: fx.files.first.id,
        title: 'Конспект',
        sortOrder: 0,
        file: {
          id: fx.files.first.id,
          kind: 'ATTACHMENT',
          originalName: 'first.pdf',
          mimeType: 'application/pdf',
          isReady: true,
        },
      });

      const duplicate = await request(app)
        .post(url)
        .set(auth(fx.authorToken))
        .send({ fileId: fx.files.first.id, title: 'Ще раз' });
      expect(duplicate.status).toBe(409);

      const second = await request(app)
        .post(url)
        .set(auth(fx.authorToken))
        .send({ fileId: fx.files.second.id, title: 'Завдання' });
      expect(second.status).toBe(201);
      expect(second.body.sortOrder).toBe(1);

      const course = await request(app)
        .get(`/api/author/courses/${material.id}`)
        .set(auth(fx.authorToken));
      expect(course.status).toBe(200);
      expect(
        (course.body.courseFiles as Array<{ fileId: string }>).map((item) => item.fileId),
      ).toEqual([fx.files.first.id, fx.files.second.id]);
    });

    it('renames, reorders and detaches files without deleting them', async () => {
      const fx = await seedFixture();
      const material = await fx.createCourse(ContentType.MATERIAL);
      const url = `/api/author/courses/${material.id}/files`;

      const first = await request(app)
        .post(url)
        .set(auth(fx.authorToken))
        .send({ fileId: fx.files.first.id, title: 'Перший' });
      const second = await request(app)
        .post(url)
        .set(auth(fx.authorToken))
        .send({ fileId: fx.files.second.id, title: 'Другий' });
      const firstId = first.body.id as string;
      const secondId = second.body.id as string;

      const renamed = await request(app)
        .patch(`${url}/${firstId}`)
        .set(auth(fx.authorToken))
        .send({ title: 'Оновлений' });
      expect(renamed.status).toBe(200);
      expect(renamed.body.title).toBe('Оновлений');

      const reordered = await request(app)
        .patch(`${url}/reorder`)
        .set(auth(fx.authorToken))
        .send({
          files: [
            { id: firstId, sortOrder: 1 },
            { id: secondId, sortOrder: 0 },
          ],
        });
      expect(reordered.status).toBe(200);
      expect((reordered.body as Array<{ id: string }>).map((item) => item.id)).toEqual([
        secondId,
        firstId,
      ]);

      const foreignReorder = await request(app)
        .patch(`${url}/reorder`)
        .set(auth(fx.authorToken))
        .send({ files: [{ id: RANDOM_UUID, sortOrder: 0 }] });
      expect(foreignReorder.status).toBe(404);

      const foreignPatch = await request(app)
        .patch(`${url}/${RANDOM_UUID}`)
        .set(auth(fx.authorToken))
        .send({ title: 'Чужий' });
      expect(foreignPatch.status).toBe(404);

      const removed = await request(app)
        .delete(`${url}/${firstId}`)
        .set(auth(fx.authorToken));
      expect(removed.status).toBe(204);
      expect(await prisma.courseFile.count({ where: { courseId: material.id } })).toBe(1);
      expect(await prisma.file.findUnique({ where: { id: fx.files.first.id } })).not.toBeNull();
    });

    it('is closed while the material is in MODERATION', async () => {
      const fx = await seedFixture();
      const material = await fx.createCourse(ContentType.MATERIAL, CourseStatus.MODERATION);
      const courseFile = await prisma.courseFile.create({
        data: { courseId: material.id, fileId: fx.files.first.id, title: 'Файл', sortOrder: 0 },
      });
      const url = `/api/author/courses/${material.id}/files`;
      const headers = auth(fx.authorToken);

      const results = await Promise.all([
        request(app).post(url).set(headers).send({ fileId: fx.files.second.id, title: 'Файл' }),
        request(app).patch(`${url}/reorder`).set(headers).send({ files: [] }),
        request(app).patch(`${url}/${courseFile.id}`).set(headers).send({ title: 'Нова' }),
        request(app).delete(`${url}/${courseFile.id}`).set(headers),
      ]);

      expect(results.map((res) => res.status)).toEqual([409, 409, 409, 409]);
    });

    it('hides the course from another author', async () => {
      const fx = await seedFixture();
      const material = await fx.createCourse(ContentType.MATERIAL);

      const res = await request(app)
        .post(`/api/author/courses/${material.id}/files`)
        .set(auth(fx.otherToken))
        .send({ fileId: fx.files.foreign.id, title: 'Файл' });

      expect(res.status).toBe(404);
    });
  });

  describe('submit for moderation', () => {
    async function submit(token: string, courseId: string) {
      return request(app).post(`/api/author/courses/${courseId}/submit`).set(auth(token));
    }

    it('rejects a COURSE without lessons', async () => {
      const fx = await seedFixture();
      const course = await fx.createCourse(ContentType.COURSE);

      const res = await submit(fx.authorToken, course.id);

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('lessons');
    });

    it('rejects a VIDEO lesson without a video or with an unprocessed one', async () => {
      const fx = await seedFixture();
      const noVideo = await fx.createCourse(ContentType.COURSE);
      const lesson = await fx.createLesson(noVideo.id, LessonType.VIDEO);

      const missing = await submit(fx.authorToken, noVideo.id);
      expect(missing.status).toBe(400);
      expect(missing.body.error.details[0].field).toBe(`lessons.${lesson.id}.video`);

      const processing = await fx.createCourse(ContentType.COURSE);
      const processingLesson = await fx.createLesson(
        processing.id,
        LessonType.VIDEO,
        fx.files.videoNotReady.id,
      );
      const notReady = await submit(fx.authorToken, processing.id);
      expect(notReady.status).toBe(400);
      expect(notReady.body.error.details[0].field).toBe(`lessons.${processingLesson.id}.video`);
    });

    it('rejects a QUIZ lesson without a quiz and a question without a correct option', async () => {
      const fx = await seedFixture();
      const noQuiz = await fx.createCourse(ContentType.COURSE);
      const noQuizLesson = await fx.createLesson(noQuiz.id, LessonType.QUIZ);

      const missing = await submit(fx.authorToken, noQuiz.id);
      expect(missing.status).toBe(400);
      expect(missing.body.error.details[0].field).toBe(`lessons.${noQuizLesson.id}.quiz`);

      const noCorrect = await fx.createCourse(ContentType.COURSE);
      const lesson = await fx.createLesson(noCorrect.id, LessonType.QUIZ);
      const quiz = await prisma.quiz.create({ data: { lessonId: lesson.id, title: 'Тест' } });
      const question = await prisma.question.create({
        data: {
          quizId: quiz.id,
          type: QuestionType.SINGLE,
          text: 'Питання',
          options: {
            create: [
              { text: 'А', isCorrect: false, sortOrder: 0 },
              { text: 'Б', isCorrect: false, sortOrder: 1 },
            ],
          },
        },
      });

      const res = await submit(fx.authorToken, noCorrect.id);
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe(
        `lessons.${lesson.id}.quiz.questions.${question.id}`,
      );
    });

    it('sends a complete COURSE to moderation', async () => {
      const fx = await seedFixture();
      const course = await fx.createCourse(ContentType.COURSE);
      await fx.createLesson(course.id, LessonType.VIDEO, fx.files.video.id);

      const res = await submit(fx.authorToken, course.id);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('MODERATION');
    });

    it('requires a file in a MATERIAL', async () => {
      const fx = await seedFixture();
      const material = await fx.createCourse(ContentType.MATERIAL);

      const empty = await submit(fx.authorToken, material.id);
      expect(empty.status).toBe(400);
      expect(empty.body.error.details[0].field).toBe('courseFiles');

      await prisma.courseFile.create({
        data: { courseId: material.id, fileId: fx.files.first.id, title: 'Файл', sortOrder: 0 },
      });

      const filled = await submit(fx.authorToken, material.id);
      expect(filled.status).toBe(200);
      expect(filled.body.status).toBe('MODERATION');
    });
  });

  describe('quizzes in unpublished courses', () => {
    it('lets the author create a quiz after the course was unpublished', async () => {
      const fx = await seedFixture();
      const course = await fx.createCourse(ContentType.COURSE, CourseStatus.UNPUBLISHED);
      const lesson = await fx.createLesson(course.id, LessonType.QUIZ);

      const res = await request(app)
        .post(`/api/author/lessons/${lesson.id}/quiz`)
        .set(auth(fx.authorToken))
        .send({});

      expect(res.status).toBe(201);
    });
  });
});

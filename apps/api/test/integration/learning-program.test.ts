import { randomUUID } from 'node:crypto';
import {
  ContentType,
  CourseStatus,
  EnrollmentSource,
  FileKind,
  LessonType,
  ProgressStatus,
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
const CATEGORY_SLUG = 'learning-program-category';

interface Fixture {
  courseA: string;
  materialB: string;
  courseD: string;
  l1: string;
  l2: string;
  l3: string;
  authorToken: string;
  studentToken: string;
  revokedToken: string;
  outsiderToken: string;
  adminToken: string;
}

interface ItemShape {
  course: { id: string };
  progress: { continueLesson: { id: string } } | null;
  materials: unknown;
}

interface LessonShape {
  id: string;
  isCompleted: boolean;
  isLocked: boolean;
}

interface ModuleShape {
  lessons: LessonShape[];
}

async function resetState(): Promise<void> {
  // Enrollment -> Course is onDelete: Restrict, so enrollments go first;
  // deleting Course cascades modules, lessons, progress and course files,
  // which frees the File rows (CourseFile -> File is Restrict).
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixture(): Promise<Fixture> {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Категорія програми' },
  });

  const makeUser = (label: string, roles: UserRole[]) =>
    prisma.user.create({
      data: { email: `program-${label}-${randomUUID()}@example.com`, fullName: `Program ${label}`, roles },
    });

  const author = await makeUser('author', [UserRole.STUDENT, UserRole.AUTHOR]);
  const student = await makeUser('student', [UserRole.STUDENT]);
  const revoked = await makeUser('revoked', [UserRole.STUDENT]);
  const outsider = await makeUser('outsider', [UserRole.STUDENT]);
  const admin = await makeUser('admin', [UserRole.ADMIN]);

  const makeCourse = (type: ContentType, title: string, deletedAt: Date | null = null) =>
    prisma.course.create({
      data: {
        authorId: author.id,
        categoryId: category.id,
        type,
        status: CourseStatus.PUBLISHED,
        slug: `program-${randomUUID()}`,
        title,
        shortDescription: 'Короткий опис',
        description: 'Повний опис',
        publishedAt: new Date(),
        deletedAt,
      },
    });

  const courseA = await makeCourse(ContentType.COURSE, 'Курс A');
  const materialB = await makeCourse(ContentType.MATERIAL, 'Матеріал B');
  const courseC = await makeCourse(ContentType.COURSE, 'Курс C', new Date());
  const courseD = await makeCourse(ContentType.COURSE, 'Курс D');

  const m1 = await prisma.module.create({ data: { courseId: courseA.id, title: 'M1', sortOrder: 0 } });
  const m2 = await prisma.module.create({ data: { courseId: courseA.id, title: 'M2', sortOrder: 1 } });

  const makeLesson = (
    moduleId: string,
    title: string,
    sortOrder: number,
    extra: { isFreePreview?: boolean; deletedAt?: Date } = {},
  ) =>
    prisma.lesson.create({
      data: { moduleId, type: LessonType.TEXT, title, sortOrder, textContent: 'secret body', ...extra },
    });

  const l1 = await makeLesson(m1.id, 'L1', 0, { isFreePreview: true });
  const l2 = await makeLesson(m1.id, 'L2', 1);
  const l3 = await makeLesson(m2.id, 'L3', 0);
  const l4 = await makeLesson(m2.id, 'L4', 1, { deletedAt: new Date() });

  const makeFile = (name: string, size: number, isReady: boolean) =>
    prisma.file.create({
      data: {
        uploadedById: author.id,
        kind: FileKind.ATTACHMENT,
        provider: StorageProvider.S3,
        storageKey: `attachment/${randomUUID()}-${name}`,
        originalName: name,
        mimeType: 'application/octet-stream',
        sizeBytes: BigInt(size),
        isReady,
      },
    });

  const pdf = await makeFile('notes.pdf', 100, true);
  const zip = await makeFile('pack.zip', 250, true);
  const pending = await makeFile('draft.docx', 999, false);

  await prisma.courseFile.createMany({
    data: [
      { courseId: materialB.id, fileId: pdf.id, title: 'Конспект', sortOrder: 0 },
      { courseId: materialB.id, fileId: zip.id, title: 'Архів', sortOrder: 1 },
      { courseId: materialB.id, fileId: pending.id, title: 'Чернетка', sortOrder: 2 },
    ],
  });

  const enroll = (userId: string, courseId: string, revokedAt: Date | null = null) =>
    prisma.enrollment.create({
      data: { userId, courseId, source: EnrollmentSource.PURCHASE, revokedAt },
    });

  const enrollmentA = await enroll(student.id, courseA.id);
  await enroll(student.id, materialB.id);
  await enroll(student.id, courseC.id);
  await enroll(student.id, courseD.id, new Date());
  await enroll(revoked.id, courseD.id, new Date());

  await prisma.lessonProgress.createMany({
    data: [
      { enrollmentId: enrollmentA.id, lessonId: l2.id, status: ProgressStatus.COMPLETED },
      { enrollmentId: enrollmentA.id, lessonId: l4.id, status: ProgressStatus.COMPLETED },
    ],
  });

  return {
    courseA: courseA.id,
    materialB: materialB.id,
    courseD: courseD.id,
    l1: l1.id,
    l2: l2.id,
    l3: l3.id,
    authorToken: signAccessToken(author.id, author.roles),
    studentToken: signAccessToken(student.id, student.roles),
    revokedToken: signAccessToken(revoked.id, revoked.roles),
    outsiderToken: signAccessToken(outsider.id, outsider.roles),
    adminToken: signAccessToken(admin.id, admin.roles),
  };
}

function bearer(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}

function courseIds(items: ItemShape[]): string[] {
  return items.map((item) => item.course.id);
}

function lessonsOf(modules: ModuleShape[]): LessonShape[] {
  return modules.flatMap((learningModule) => learningModule.lessons);
}

describe('my enrollments and course program integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('GET /api/me/enrollments', () => {
    it('requires authentication and validates the query', async () => {
      const fixture = await seedFixture();

      const anonymous = await request(app).get('/api/me/enrollments');
      expect(anonymous.status).toBe(401);

      const badType = await request(app).get('/api/me/enrollments?type=FOO').set(...bearer(fixture.studentToken));
      expect(badType.status).toBe(400);

      const extra = await request(app).get('/api/me/enrollments?foo=1').set(...bearer(fixture.studentToken));
      expect(extra.status).toBe(400);
    });

    it('lists active enrollments of live courses with progress and materials', async () => {
      const fixture = await seedFixture();

      const response = await request(app).get('/api/me/enrollments').set(...bearer(fixture.studentToken));
      expect(response.status).toBe(200);

      const items: ItemShape[] = response.body.items;
      expect(courseIds(items).sort()).toEqual([fixture.courseA, fixture.materialB].sort());

      const a = items.find((item) => item.course.id === fixture.courseA);
      expect(a?.progress).toMatchObject({
        completedLessons: 1,
        totalLessons: 3,
        percent: 33,
        state: 'IN_PROGRESS',
        completedAt: null,
      });
      expect(a?.progress?.continueLesson.id).toBe(fixture.l1);
      expect(a?.materials).toBeNull();

      const b = items.find((item) => item.course.id === fixture.materialB);
      expect(b?.progress).toBeNull();
      expect(b?.materials).toEqual({ filesCount: 2, totalSizeBytes: '350', formats: ['pdf', 'zip'] });
    });

    it('filters by type', async () => {
      const fixture = await seedFixture();

      const materials = await request(app)
        .get('/api/me/enrollments?type=MATERIAL')
        .set(...bearer(fixture.studentToken));
      expect(courseIds(materials.body.items)).toEqual([fixture.materialB]);

      const courses = await request(app)
        .get('/api/me/enrollments?type=COURSE')
        .set(...bearer(fixture.studentToken));
      expect(courseIds(courses.body.items)).toEqual([fixture.courseA]);
    });

    it('reports COMPLETED once every current lesson is done', async () => {
      const fixture = await seedFixture();
      const enrollment = await prisma.enrollment.findFirstOrThrow({ where: { courseId: fixture.courseA } });

      await prisma.lessonProgress.createMany({
        data: [
          { enrollmentId: enrollment.id, lessonId: fixture.l1, status: ProgressStatus.COMPLETED },
          { enrollmentId: enrollment.id, lessonId: fixture.l3, status: ProgressStatus.COMPLETED },
        ],
      });

      const response = await request(app)
        .get('/api/me/enrollments?type=COURSE')
        .set(...bearer(fixture.studentToken));
      expect(response.body.items[0].progress).toMatchObject({
        state: 'COMPLETED',
        percent: 100,
        continueLesson: null,
      });
    });
  });

  describe('GET /api/learn/courses/:courseId', () => {
    it('requires authentication and validates the id', async () => {
      const fixture = await seedFixture();

      const anonymous = await request(app).get(`/api/learn/courses/${fixture.courseA}`);
      expect(anonymous.status).toBe(401);

      const invalid = await request(app).get('/api/learn/courses/nope').set(...bearer(fixture.studentToken));
      expect(invalid.status).toBe(400);

      const missing = await request(app)
        .get(`/api/learn/courses/${randomUUID()}`)
        .set(...bearer(fixture.studentToken));
      expect(missing.status).toBe(404);
    });

    it('gives an enrolled student the ordered program with completion marks', async () => {
      const fixture = await seedFixture();

      const response = await request(app)
        .get(`/api/learn/courses/${fixture.courseA}`)
        .set(...bearer(fixture.studentToken));
      expect(response.status).toBe(200);
      expect(response.body.access).toBe('ENROLLED');

      const lessons = lessonsOf(response.body.modules);
      expect(lessons.map((lesson) => lesson.id)).toEqual([fixture.l1, fixture.l2, fixture.l3]);
      expect(lessons.map((lesson) => lesson.isCompleted)).toEqual([false, true, false]);
      expect(lessons.map((lesson) => lesson.isLocked)).toEqual([false, false, false]);
      expect(response.body.progress).toMatchObject({ completedLessons: 1, totalLessons: 3, percent: 33 });

      const raw = JSON.stringify(response.body);
      for (const forbidden of ['textContent', 'hlsUrl', 'isCorrect']) {
        expect(raw).not.toContain(forbidden);
      }
    });

    it('shows an outsider a locked preview of a published course', async () => {
      const fixture = await seedFixture();

      const response = await request(app)
        .get(`/api/learn/courses/${fixture.courseA}`)
        .set(...bearer(fixture.outsiderToken));
      expect(response.status).toBe(200);
      expect(response.body.access).toBe('PREVIEW');
      expect(response.body.progress).toBeNull();

      const lessons = lessonsOf(response.body.modules);
      expect(lessons.map((lesson) => lesson.isLocked)).toEqual([false, true, true]);
      expect(lessons.every((lesson) => !lesson.isCompleted)).toBe(true);
    });

    it('treats a revoked enrollment as a preview', async () => {
      const fixture = await seedFixture();

      const response = await request(app)
        .get(`/api/learn/courses/${fixture.courseD}`)
        .set(...bearer(fixture.revokedToken));
      expect(response.status).toBe(200);
      expect(response.body.access).toBe('PREVIEW');
    });

    it('keeps an unpublished course for the enrolled and hides it from outsiders', async () => {
      const fixture = await seedFixture();
      await prisma.course.update({ where: { id: fixture.courseA }, data: { status: CourseStatus.UNPUBLISHED } });

      const outsider = await request(app)
        .get(`/api/learn/courses/${fixture.courseA}`)
        .set(...bearer(fixture.outsiderToken));
      expect(outsider.status).toBe(404);

      const student = await request(app)
        .get(`/api/learn/courses/${fixture.courseA}`)
        .set(...bearer(fixture.studentToken));
      expect(student.status).toBe(200);
    });

    it('grants the author and an admin access to a DRAFT course', async () => {
      const fixture = await seedFixture();
      await prisma.course.update({ where: { id: fixture.courseA }, data: { status: CourseStatus.DRAFT } });

      const asAuthor = await request(app)
        .get(`/api/learn/courses/${fixture.courseA}`)
        .set(...bearer(fixture.authorToken));
      expect(asAuthor.status).toBe(200);
      expect(asAuthor.body.access).toBe('AUTHOR');

      const asAdmin = await request(app)
        .get(`/api/learn/courses/${fixture.courseA}`)
        .set(...bearer(fixture.adminToken));
      expect(asAdmin.status).toBe(200);
      expect(asAdmin.body.access).toBe('ADMIN');
    });

    it('lists material files for an enrolled student of a MATERIAL', async () => {
      const fixture = await seedFixture();

      const response = await request(app)
        .get(`/api/learn/courses/${fixture.materialB}`)
        .set(...bearer(fixture.studentToken));
      expect(response.status).toBe(200);
      expect(response.body.modules).toEqual([]);
      expect(response.body.materials).toHaveLength(2);
      for (const material of response.body.materials) {
        expect(typeof material.fileId).toBe('string');
      }
    });
  });
});

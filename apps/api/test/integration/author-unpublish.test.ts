import { ContentType, CourseStatus, EnrollmentSource, LessonType, ModerationAction, UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

const app = createApp();
const CATEGORY_SLUG = 'author-unpublish-category';
const AUTHOR_EMAIL = 'author-unpublish@example.com';
const STUDENT_EMAIL = 'student-unpublish@example.com';

async function resetState(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { in: [AUTHOR_EMAIL, STUDENT_EMAIL] } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  const courses = await prisma.course.findMany({
    where: { authorId: { in: userIds } },
    select: { id: true },
  });
  const courseIds = courses.map((course) => course.id);

  if (courseIds.length > 0) {
    await prisma.enrollment.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.moderationLog.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  }

  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixture() {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Зняття з публікації' },
  });
  const author = await prisma.user.create({
    data: { email: AUTHOR_EMAIL, fullName: 'Author Unpublish', roles: [UserRole.AUTHOR] },
  });
  const student = await prisma.user.create({
    data: { email: STUDENT_EMAIL, fullName: 'Student Unpublish', roles: [UserRole.STUDENT] },
  });
  const course = await prisma.course.create({
    data: {
      authorId: author.id,
      categoryId: category.id,
      type: ContentType.COURSE,
      status: CourseStatus.PUBLISHED,
      slug: 'published-course-to-unpublish',
      title: 'Опублікований курс',
      shortDescription: 'Короткий опис',
      description: 'Повний опис курсу',
      priceAmount: 10_000,
      publishedAt: new Date(),
      modules: {
        create: {
          title: 'Модуль',
          sortOrder: 0,
          lessons: { create: { type: LessonType.TEXT, title: 'Урок', sortOrder: 0 } },
        },
      },
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: student.id,
      courseId: course.id,
      source: EnrollmentSource.PURCHASE,
    },
  });

  return {
    course,
    authorId: author.id,
    authorToken: signAccessToken(author.id, author.roles),
    studentToken: signAccessToken(student.id, student.roles),
  };
}

describe('author course unpublish integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('lets the author unpublish a published course and keeps it available to an enrolled student', async () => {
    const fixture = await seedFixture();

    const unpublish = await request(app)
      .post(`/api/author/courses/${fixture.course.id}/unpublish`)
      .set('Authorization', `Bearer ${fixture.authorToken}`);

    expect(unpublish.status).toBe(200);
    expect(unpublish.body.status).toBe('UNPUBLISHED');

    const logs = await prisma.moderationLog.findMany({
      where: { courseId: fixture.course.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: ModerationAction.UNPUBLISHED,
      fromStatus: CourseStatus.PUBLISHED,
      toStatus: CourseStatus.UNPUBLISHED,
    });
    expect(logs[0]?.moderatorId).toBe(fixture.authorId);

    const catalog = await request(app).get('/api/courses');
    expect(catalog.status).toBe(200);
    expect((catalog.body.items as Array<{ id: string }>).some((item) => item.id === fixture.course.id)).toBe(false);

    const guest = await request(app).get(`/api/courses/${fixture.course.slug}`);
    expect(guest.status).toBe(404);

    const enrolled = await request(app)
      .get(`/api/courses/${fixture.course.slug}`)
      .set('Authorization', `Bearer ${fixture.studentToken}`);
    expect(enrolled.status).toBe(200);
    expect(enrolled.body.id).toBe(fixture.course.id);
    expect(enrolled.body.hasAccess).toBe(true);
    expect(enrolled.body.canReview).toBe(false);
  });

  it('allows editing an unpublished course and resubmitting it for moderation', async () => {
    const fixture = await seedFixture();

    await request(app)
      .post(`/api/author/courses/${fixture.course.id}/unpublish`)
      .set('Authorization', `Bearer ${fixture.authorToken}`)
      .expect(200);

    const update = await request(app)
      .patch(`/api/author/courses/${fixture.course.id}`)
      .set('Authorization', `Bearer ${fixture.authorToken}`)
      .send({ title: 'Оновлений курс після зняття' });
    expect(update.status).toBe(200);
    expect(update.body.title).toBe('Оновлений курс після зняття');
    expect(update.body.status).toBe('UNPUBLISHED');

    const submit = await request(app)
      .post(`/api/author/courses/${fixture.course.id}/submit`)
      .set('Authorization', `Bearer ${fixture.authorToken}`);
    expect(submit.status).toBe(200);
    expect(submit.body.status).toBe('MODERATION');

    const logs = await prisma.moderationLog.findMany({
      where: { courseId: fixture.course.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(logs.map((log) => log.action)).toEqual([
      ModerationAction.UNPUBLISHED,
      ModerationAction.SUBMITTED,
    ]);
    expect(logs[1]).toMatchObject({
      fromStatus: CourseStatus.UNPUBLISHED,
      toStatus: CourseStatus.MODERATION,
    });
  });

  it('returns 409 when the author tries to unpublish a course that is not published', async () => {
    const fixture = await seedFixture();
    await prisma.course.update({
      where: { id: fixture.course.id },
      data: { status: CourseStatus.DRAFT },
    });

    const response = await request(app)
      .post(`/api/author/courses/${fixture.course.id}/unpublish`)
      .set('Authorization', `Bearer ${fixture.authorToken}`);

    expect(response.status).toBe(409);
  });
});

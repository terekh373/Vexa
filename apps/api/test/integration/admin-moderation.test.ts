import { randomUUID } from 'node:crypto';
import { ContentType, CourseStatus, ModerationAction, NotificationType, UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

const app = createApp();

const CATEGORY_SLUG = 'admin-moderation-category';

interface Fixture {
  categoryId: string;
  authorId: string;
  adminId: string;
  adminToken: string;
  authorToken: string;
  studentToken: string;
}

async function resetState(): Promise<void> {
  await prisma.notification.deleteMany();
  await prisma.moderationLog.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixture(): Promise<Fixture> {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Тестова категорія' },
  });
  const author = await prisma.user.create({
    data: { email: 'author@example.com', fullName: 'Test Author', roles: [UserRole.AUTHOR] },
  });
  const admin = await prisma.user.create({
    data: { email: 'admin@example.com', fullName: 'Test Admin', roles: [UserRole.ADMIN] },
  });
  const student = await prisma.user.create({
    data: { email: 'student@example.com', fullName: 'Test Student', roles: [UserRole.STUDENT] },
  });

  return {
    categoryId: category.id,
    authorId: author.id,
    adminId: admin.id,
    adminToken: signAccessToken(admin.id, admin.roles),
    authorToken: signAccessToken(author.id, author.roles),
    studentToken: signAccessToken(student.id, student.roles),
  };
}

async function createCourse(
  fixture: Fixture,
  data: { status: CourseStatus; publishedAt?: Date | null },
) {
  return prisma.course.create({
    data: {
      authorId: fixture.authorId,
      categoryId: fixture.categoryId,
      type: ContentType.COURSE,
      status: data.status,
      slug: `course-${randomUUID()}`,
      title: 'Курс на модерації',
      shortDescription: 'Короткий опис',
      description: 'Повний опис курсу',
      submittedAt: data.status === CourseStatus.MODERATION ? new Date() : null,
      publishedAt: data.publishedAt ?? null,
    },
  });
}

describe('admin course moderation integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('rejects the moderation queue without a token with 401', async () => {
    const res = await request(app).get('/api/admin/courses');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects STUDENT and AUTHOR on the moderation queue with 403', async () => {
    const fixture = await seedFixture();

    const studentRes = await request(app)
      .get('/api/admin/courses')
      .set('Authorization', `Bearer ${fixture.studentToken}`);
    expect(studentRes.status).toBe(403);

    const authorRes = await request(app)
      .get('/api/admin/courses')
      .set('Authorization', `Bearer ${fixture.authorToken}`);
    expect(authorRes.status).toBe(403);
  });

  it('lists a course awaiting moderation in the default queue', async () => {
    const fixture = await seedFixture();
    const course = await createCourse(fixture, { status: CourseStatus.MODERATION });

    const res = await request(app)
      .get('/api/admin/courses')
      .set('Authorization', `Bearer ${fixture.adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
    const ids = (res.body.items as Array<{ id: string }>).map((item) => item.id);
    expect(ids).toContain(course.id);
  });

  it('returns full course content with moderation history on GET /api/admin/courses/:id', async () => {
    const fixture = await seedFixture();
    const course = await createCourse(fixture, { status: CourseStatus.MODERATION });

    const res = await request(app)
      .get(`/api/admin/courses/${course.id}`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: course.id, slug: course.slug });
    expect(res.body.author).toMatchObject({ id: fixture.authorId });
    expect(res.body.moderationHistory).toEqual([]);
  });

  it('returns 404 for a course id that does not exist', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .get(`/api/admin/courses/${randomUUID()}`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);

    expect(res.status).toBe(404);
  });

  it('approves a course, publishes it and makes it visible in the catalog; a repeat approval is a 409', async () => {
    const fixture = await seedFixture();
    const course = await createCourse(fixture, { status: CourseStatus.MODERATION });

    const approve = await request(app)
      .post(`/api/admin/courses/${course.id}/moderate`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ action: 'APPROVE' });

    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe('PUBLISHED');
    expect(approve.body.publishedAt).not.toBeNull();
    expect(approve.body.moderationHistory).toHaveLength(1);
    expect(approve.body.moderationHistory[0]).toMatchObject({
      action: 'APPROVED',
      fromStatus: 'MODERATION',
      toStatus: 'PUBLISHED',
      moderator: { id: fixture.adminId },
    });

    const catalog = await request(app).get('/api/courses');
    expect(catalog.status).toBe(200);
    const slugs = (catalog.body.items as Array<{ slug: string }>).map((item) => item.slug);
    expect(slugs).toContain(course.slug);

    const repeat = await request(app)
      .post(`/api/admin/courses/${course.id}/moderate`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ action: 'APPROVE' });
    expect(repeat.status).toBe(409);

    const logs = await prisma.moderationLog.findMany({ where: { courseId: course.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe(ModerationAction.APPROVED);

    const notifications = await prisma.notification.findMany({
      where: { userId: fixture.authorId, type: NotificationType.MODERATION },
    });
    expect(notifications).toHaveLength(1);
  });

  it('rejects a moderation request without a comment with 400', async () => {
    const fixture = await seedFixture();
    const course = await createCourse(fixture, { status: CourseStatus.MODERATION });

    const res = await request(app)
      .post(`/api/admin/courses/${course.id}/moderate`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ action: 'REJECT' });

    expect(res.status).toBe(400);
  });

  it('rejects a course with a comment', async () => {
    const fixture = await seedFixture();
    const course = await createCourse(fixture, { status: CourseStatus.MODERATION });

    const res = await request(app)
      .post(`/api/admin/courses/${course.id}/moderate`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ action: 'REJECT', comment: 'Потрібно виправити опис курсу' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REJECTED');
    expect(res.body.rejectionReason).toBe('Потрібно виправити опис курсу');

    const logs = await prisma.moderationLog.findMany({ where: { courseId: course.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe(ModerationAction.REJECTED);

    const notifications = await prisma.notification.findMany({
      where: { userId: fixture.authorId, type: NotificationType.MODERATION },
    });
    expect(notifications).toHaveLength(1);
  });

  it('unpublishes a published course', async () => {
    const fixture = await seedFixture();
    const course = await createCourse(fixture, { status: CourseStatus.PUBLISHED, publishedAt: new Date() });

    const res = await request(app)
      .post(`/api/admin/courses/${course.id}/unpublish`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ comment: 'Порушення правил платформи' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UNPUBLISHED');
    expect(res.body.rejectionReason).toBe('Порушення правил платформи');

    const logs = await prisma.moderationLog.findMany({ where: { courseId: course.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe(ModerationAction.UNPUBLISHED);

    const notifications = await prisma.notification.findMany({
      where: { userId: fixture.authorId, type: NotificationType.MODERATION },
    });
    expect(notifications).toHaveLength(1);
  });
});

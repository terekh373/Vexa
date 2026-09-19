import { randomUUID } from 'node:crypto';
import {
  ContentType,
  CourseStatus,
  EnrollmentSource,
  ReviewStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

const app = createApp();
const CATEGORY_SLUG = 'reviews-integration-category';

interface Fixture {
  courseId: string;
  authorId: string;
  studentId: string;
  outsiderId: string;
  otherAuthorId: string;
  adminId: string;
  grantStudentId: string;
  authorToken: string;
  studentToken: string;
  outsiderToken: string;
  otherAuthorToken: string;
  adminToken: string;
  grantStudentToken: string;
}

async function resetState(): Promise<void> {
  await prisma.review.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixture(): Promise<Fixture> {
  const category = await prisma.category.create({
    data: {
      slug: CATEGORY_SLUG,
      nameUk: 'Тестова категорія відгуків',
    },
  });

  const author = await prisma.user.create({
    data: {
      email: `reviews-author-${randomUUID()}@example.com`,
      fullName: 'Review Author',
      roles: [UserRole.AUTHOR],
    },
  });
  const student = await prisma.user.create({
    data: {
      email: `reviews-student-${randomUUID()}@example.com`,
      fullName: 'Review Student',
      roles: [UserRole.STUDENT],
    },
  });
  const outsider = await prisma.user.create({
    data: {
      email: `reviews-outsider-${randomUUID()}@example.com`,
      fullName: 'Outside Student',
      roles: [UserRole.STUDENT],
    },
  });
  const otherAuthor = await prisma.user.create({
    data: {
      email: `reviews-other-author-${randomUUID()}@example.com`,
      fullName: 'Other Author',
      roles: [UserRole.AUTHOR],
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: `reviews-admin-${randomUUID()}@example.com`,
      fullName: 'Review Admin',
      roles: [UserRole.ADMIN],
    },
  });
  const grantStudent = await prisma.user.create({
    data: {
      email: `reviews-grant-student-${randomUUID()}@example.com`,
      fullName: 'Grant Student',
      roles: [UserRole.STUDENT],
    },
  });

  await prisma.authorProfile.create({
    data: {
      userId: author.id,
      displayName: 'Review Author',
    },
  });

  const course = await prisma.course.create({
    data: {
      authorId: author.id,
      categoryId: category.id,
      type: ContentType.COURSE,
      status: CourseStatus.PUBLISHED,
      slug: `reviews-course-${randomUUID()}`,
      title: 'Курс для тесту відгуків',
      shortDescription: 'Короткий опис',
      description: 'Повний опис',
      priceAmount: 10_000,
      publishedAt: new Date(),
    },
  });

  await prisma.enrollment.createMany({
    data: [
      {
        userId: student.id,
        courseId: course.id,
        source: EnrollmentSource.PURCHASE,
      },
      {
        userId: admin.id,
        courseId: course.id,
        source: EnrollmentSource.PURCHASE,
      },
      {
        userId: grantStudent.id,
        courseId: course.id,
        source: EnrollmentSource.ADMIN_GRANT,
      },
    ],
  });

  return {
    courseId: course.id,
    authorId: author.id,
    studentId: student.id,
    outsiderId: outsider.id,
    otherAuthorId: otherAuthor.id,
    adminId: admin.id,
    grantStudentId: grantStudent.id,
    authorToken: signAccessToken(author.id, author.roles),
    studentToken: signAccessToken(student.id, student.roles),
    outsiderToken: signAccessToken(outsider.id, outsider.roles),
    otherAuthorToken: signAccessToken(otherAuthor.id, otherAuthor.roles),
    adminToken: signAccessToken(admin.id, admin.roles),
    grantStudentToken: signAccessToken(grantStudent.id, grantStudent.roles),
  };
}

describe('course reviews integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('requires authentication and an active Enrollment to create a review', async () => {
    const fixture = await seedFixture();

    const anonymous = await request(app)
      .post(`/api/courses/${fixture.courseId}/reviews`)
      .send({ rating: 5, text: 'Чудовий курс' });
    expect(anonymous.status).toBe(401);

    const noEnrollment = await request(app)
      .post(`/api/courses/${fixture.courseId}/reviews`)
      .set('Authorization', `Bearer ${fixture.outsiderToken}`)
      .send({ rating: 5, text: 'Чудовий курс' });
    expect(noEnrollment.status).toBe(403);

    expect(await prisma.review.count()).toBe(0);
  });

  it('rejects admins and ADMIN_GRANT enrollments and hides the review form', async () => {
    const fixture = await seedFixture();

    const adminDetails = await request(app)
      .get(`/api/courses/${fixture.courseId}`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(adminDetails.status).toBe(200);
    expect(adminDetails.body.hasAccess).toBe(true);
    expect(adminDetails.body.canReview).toBe(false);

    const adminReview = await request(app)
      .post(`/api/courses/${fixture.courseId}/reviews`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ rating: 5, text: 'Адмін не має залишати відгук' });
    expect(adminReview.status).toBe(403);

    const grantDetails = await request(app)
      .get(`/api/courses/${fixture.courseId}`)
      .set('Authorization', `Bearer ${fixture.grantStudentToken}`);
    expect(grantDetails.status).toBe(200);
    expect(grantDetails.body.hasAccess).toBe(true);
    expect(grantDetails.body.canReview).toBe(false);

    const grantReview = await request(app)
      .post(`/api/courses/${fixture.courseId}/reviews`)
      .set('Authorization', `Bearer ${fixture.grantStudentToken}`)
      .send({ rating: 5, text: 'Адмінський доступ — не покупка' });
    expect(grantReview.status).toBe(403);

    expect(await prisma.review.count()).toBe(0);
  });

  it('creates one review, recalculates course rating and rejects a duplicate with 409', async () => {
    const fixture = await seedFixture();

    const before = await request(app)
      .get(`/api/courses/${fixture.courseId}`)
      .set('Authorization', `Bearer ${fixture.studentToken}`);
    expect(before.status).toBe(200);
    expect(before.body.canReview).toBe(true);

    const created = await request(app)
      .post(`/api/courses/${fixture.courseId}/reviews`)
      .set('Authorization', `Bearer ${fixture.studentToken}`)
      .send({ rating: 5, text: 'Дуже корисно' });

    expect(created.status).toBe(201);
    expect(created.body.review).toMatchObject({
      rating: 5,
      text: 'Дуже корисно',
      author: { id: fixture.studentId },
    });
    expect(created.body.rating).toEqual({ average: 5, count: 1 });

    const course = await prisma.course.findUniqueOrThrow({
      where: { id: fixture.courseId },
      select: { ratingAvg: true, reviewsCount: true },
    });
    expect(Number(course.ratingAvg)).toBe(5);
    expect(course.reviewsCount).toBe(1);

    const authorProfile = await prisma.authorProfile.findUniqueOrThrow({
      where: { userId: fixture.authorId },
      select: { ratingAvg: true, reviewsCount: true },
    });
    expect(Number(authorProfile.ratingAvg)).toBe(5);
    expect(authorProfile.reviewsCount).toBe(1);

    const catalog = await request(app).get('/api/courses?limit=50');
    expect(catalog.status).toBe(200);
    const catalogCourse = (catalog.body.items as Array<{
      id: string;
      rating: { average: number; reviewsCount: number };
    }>).find((item) => item.id === fixture.courseId);
    expect(catalogCourse?.rating).toEqual({ average: 5, reviewsCount: 1 });

    const after = await request(app)
      .get(`/api/courses/${fixture.courseId}`)
      .set('Authorization', `Bearer ${fixture.studentToken}`);
    expect(after.status).toBe(200);
    expect(after.body.canReview).toBe(false);

    const duplicate = await request(app)
      .post(`/api/courses/${fixture.courseId}/reviews`)
      .set('Authorization', `Bearer ${fixture.studentToken}`)
      .send({ rating: 4 });
    expect(duplicate.status).toBe(409);
  });

  it('updates the current user review and recalculates the denormalized rating', async () => {
    const fixture = await seedFixture();

    await request(app)
      .post(`/api/courses/${fixture.courseId}/reviews`)
      .set('Authorization', `Bearer ${fixture.studentToken}`)
      .send({ rating: 5, text: 'Перший текст' })
      .expect(201);

    const updated = await request(app)
      .patch(`/api/courses/${fixture.courseId}/reviews/my`)
      .set('Authorization', `Bearer ${fixture.studentToken}`)
      .send({ rating: 3, text: 'Оновлений текст' });

    expect(updated.status).toBe(200);
    expect(updated.body.review).toMatchObject({
      rating: 3,
      text: 'Оновлений текст',
    });
    expect(updated.body.rating).toEqual({ average: 3, count: 1 });

    const course = await prisma.course.findUniqueOrThrow({
      where: { id: fixture.courseId },
      select: { ratingAvg: true, reviewsCount: true },
    });
    expect(Number(course.ratingAvg)).toBe(3);
    expect(course.reviewsCount).toBe(1);

    const authorProfile = await prisma.authorProfile.findUniqueOrThrow({
      where: { userId: fixture.authorId },
      select: { ratingAvg: true, reviewsCount: true },
    });
    expect(Number(authorProfile.ratingAvg)).toBe(3);
    expect(authorProfile.reviewsCount).toBe(1);
  });

  it('allows only the course author to reply and exposes the reply in the public list', async () => {
    const fixture = await seedFixture();

    const created = await request(app)
      .post(`/api/courses/${fixture.courseId}/reviews`)
      .set('Authorization', `Bearer ${fixture.studentToken}`)
      .send({ rating: 4, text: 'Корисний курс' });
    expect(created.status).toBe(201);
    const reviewId = created.body.review.id as string;

    await prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.HIDDEN },
    });

    const hiddenReply = await request(app)
      .post(`/api/author/reviews/${reviewId}/reply`)
      .set('Authorization', `Bearer ${fixture.authorToken}`)
      .send({ text: 'Не можна відповідати на прихований відгук' });
    expect(hiddenReply.status).toBe(404);

    await prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.PUBLISHED },
    });

    const foreignAuthor = await request(app)
      .post(`/api/author/reviews/${reviewId}/reply`)
      .set('Authorization', `Bearer ${fixture.otherAuthorToken}`)
      .send({ text: 'Чужа відповідь' });
    expect(foreignAuthor.status).toBe(404);

    const replied = await request(app)
      .post(`/api/author/reviews/${reviewId}/reply`)
      .set('Authorization', `Bearer ${fixture.authorToken}`)
      .send({ text: 'Дякую за відгук!' });
    expect(replied.status).toBe(200);
    expect(replied.body.authorReply).toBe('Дякую за відгук!');
    expect(replied.body.authorRepliedAt).not.toBeNull();

    const list = await request(app)
      .get(`/api/courses/${fixture.courseId}/reviews`);
    expect(list.status).toBe(200);
    expect(list.body.reviews).toHaveLength(1);
    expect(list.body.reviews[0]).toMatchObject({
      id: reviewId,
      authorReply: 'Дякую за відгук!',
    });
  });
});

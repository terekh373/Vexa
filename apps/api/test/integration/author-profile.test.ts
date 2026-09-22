import { randomUUID } from 'node:crypto';
import {
  ContentType,
  CourseStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

const app = createApp();
const EMAIL_DOMAIN = '@author-profile.test';
const CATEGORY_PREFIX = 'author-profile-test-category-';
const COURSE_PREFIX = 'author-profile-test-course-';

async function resetState(): Promise<void> {
  await prisma.course.deleteMany({
    where: { slug: { startsWith: COURSE_PREFIX } },
  });
  await prisma.category.deleteMany({
    where: { slug: { startsWith: CATEGORY_PREFIX } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: EMAIL_DOMAIN } },
  });
  await redis.flushdb();
}

async function createStudent(status: UserStatus = UserStatus.ACTIVE) {
  const user = await prisma.user.create({
    data: {
      email: `student-${randomUUID()}${EMAIL_DOMAIN}`,
      fullName: 'Future Author',
      roles: [UserRole.STUDENT],
      status,
    },
  });

  return {
    user,
    token: signAccessToken(user.id, user.roles),
  };
}

describe('author profile integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('activates an author profile atomically and returns tokens that pass AUTHOR routes', async () => {
    const { user, token: studentToken } = await createStudent();

    const activated = await request(app)
      .post('/api/me/author-profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        displayName: 'Олена Автор',
        headline: 'Викладач математики',
        bio: 'Пояснюю складне простими словами.',
      });

    expect(activated.status).toBe(201);
    expect(activated.body.user).toMatchObject({
      id: user.id,
      fullName: 'Future Author',
      roles: ['STUDENT', 'AUTHOR'],
    });
    expect(activated.body.authorProfile).toMatchObject({
      userId: user.id,
      displayName: 'Олена Автор',
      headline: 'Викладач математики',
      bio: 'Пояснюю складне простими словами.',
      isVerified: false,
    });
    expect(activated.body.tokens.accessToken).toEqual(expect.any(String));
    expect(activated.body.tokens.refreshToken).toEqual(expect.any(String));

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { authorProfile: true },
    });
    expect(stored.roles).toContain(UserRole.AUTHOR);
    expect(stored.authorProfile?.displayName).toBe('Олена Автор');

    const oldTokenAuthorRoute = await request(app)
      .get('/api/author/courses')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(oldTokenAuthorRoute.status).toBe(403);

    const newTokenAuthorRoute = await request(app)
      .get('/api/author/courses')
      .set('Authorization', `Bearer ${activated.body.tokens.accessToken}`);
    expect(newTokenAuthorRoute.status).toBe(200);
    expect(newTokenAuthorRoute.body).toEqual({ items: [] });
  });

  it('returns 409 on repeated activation and 403 for a blocked user', async () => {
    const first = await createStudent();

    const activated = await request(app)
      .post('/api/me/author-profile')
      .set('Authorization', `Bearer ${first.token}`)
      .send({ displayName: 'Repeat Author' });
    expect(activated.status).toBe(201);

    const repeated = await request(app)
      .post('/api/me/author-profile')
      .set('Authorization', `Bearer ${activated.body.tokens.accessToken}`)
      .send({ displayName: 'Repeat Author Again' });
    expect(repeated.status).toBe(409);
    expect(repeated.body.error.code).toBe('CONFLICT');

    const blocked = await createStudent(UserStatus.BLOCKED);
    const blockedActivation = await request(app)
      .post('/api/me/author-profile')
      .set('Authorization', `Bearer ${blocked.token}`)
      .send({ displayName: 'Blocked Author' });
    expect(blockedActivation.status).toBe(403);
    expect(blockedActivation.body.error.code).toBe('FORBIDDEN');
  });

  it('allows an author to edit the same public profile fields', async () => {
    const account = await createStudent();

    const activated = await request(app)
      .post('/api/me/author-profile')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ displayName: 'Initial Author', headline: 'Initial headline' });
    expect(activated.status).toBe(201);

    const updated = await request(app)
      .patch('/api/me/author-profile')
      .set('Authorization', `Bearer ${activated.body.tokens.accessToken}`)
      .send({
        displayName: 'Updated Author',
        headline: null,
        bio: 'Оновлена біографія',
      });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      userId: account.user.id,
      displayName: 'Updated Author',
      headline: null,
      bio: 'Оновлена біографія',
    });
  });

  it('serves the public author page and excludes draft courses', async () => {
    const author = await prisma.user.create({
      data: {
        email: `author-${randomUUID()}${EMAIL_DOMAIN}`,
        fullName: 'Public Author',
        roles: [UserRole.AUTHOR],
      },
    });

    await prisma.authorProfile.create({
      data: {
        userId: author.id,
        displayName: 'Публічний Автор',
        headline: 'Викладач фізики',
        bio: 'Біографія автора',
      },
    });

    const category = await prisma.category.create({
      data: {
        slug: `${CATEGORY_PREFIX}${randomUUID()}`,
        nameUk: 'Тестова категорія',
      },
    });

    const published = await prisma.course.create({
      data: {
        authorId: author.id,
        categoryId: category.id,
        type: ContentType.COURSE,
        status: CourseStatus.PUBLISHED,
        slug: `${COURSE_PREFIX}published-${randomUUID()}`,
        title: 'Опублікований курс',
        shortDescription: 'Короткий опис',
        description: 'Повний опис',
        publishedAt: new Date(),
      },
    });

    await prisma.course.create({
      data: {
        authorId: author.id,
        categoryId: category.id,
        type: ContentType.COURSE,
        status: CourseStatus.DRAFT,
        slug: `${COURSE_PREFIX}draft-${randomUUID()}`,
        title: 'Чернетка',
        shortDescription: 'Короткий опис чернетки',
        description: 'Повний опис чернетки',
      },
    });

    const response = await request(app).get(`/api/authors/${author.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: author.id,
      displayName: 'Публічний Автор',
      headline: 'Викладач фізики',
      bio: 'Біографія автора',
      isVerified: false,
    });
    expect(response.body.courses).toHaveLength(1);
    expect(response.body.courses[0]).toMatchObject({
      id: published.id,
      title: 'Опублікований курс',
      author: {
        id: author.id,
        displayName: 'Публічний Автор',
        isVerified: false,
      },
      category: {
        id: category.id,
        name: 'Тестова категорія',
      },
    });
    expect(response.body.courses[0].title).not.toBe('Чернетка');
  });
});

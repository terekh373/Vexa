import { randomUUID } from 'node:crypto';
import { ContentType, CourseStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { hashPassword } from '../../src/modules/auth/password.service.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

const app = createApp();

// Mirrors the private CACHE_KEY in categories.service.ts. Not exported on
// purpose (only invalidateCategoryTree is), so the value is duplicated here.
const CATEGORY_TREE_CACHE_KEY = 'categories:tree:v1';

const STUDENT_PASSWORD = 'StudentPass123';

const USER_EMAILS = [
  'admin1-uc@example.com',
  'admin2-uc@example.com',
  'author-with-profile-uc@example.com',
  'author-no-profile-uc@example.com',
  'student-uc@example.com',
];

const CATEGORY_SLUGS = [
  'admin-uc-root',
  'admin-uc-child',
  'admin-uc-empty',
  'admin-uc-alt-root',
  'admin-uc-created',
];

interface Fixture {
  admin1Id: string;
  admin1Token: string;
  admin2Id: string;
  admin2Token: string;
  authorWithProfileId: string;
  authorNoProfileId: string;
  studentId: string;
  studentToken: string;
  rootCategoryId: string;
  childCategoryId: string;
  emptyCategoryId: string;
  altRootCategoryId: string;
}

interface PublicCategoryNode {
  slug: string;
  children: PublicCategoryNode[];
}

function collectSlugs(nodes: PublicCategoryNode[]): string[] {
  return nodes.flatMap((node) => [node.slug, ...collectSlugs(node.children)]);
}

async function resetState(): Promise<void> {
  const categories = await prisma.category.findMany({
    where: { slug: { in: CATEGORY_SLUGS } },
    select: { id: true, parentId: true },
  });
  const categoryIds = categories.map((category) => category.id);

  if (categoryIds.length > 0) {
    await prisma.course.deleteMany({ where: { categoryId: { in: categoryIds } } });
  }

  // Children first: a root category's row is protected by onDelete: Restrict
  // while a child still points at it.
  const childIds = categories.filter((category) => category.parentId !== null).map((category) => category.id);
  const rootIds = categories.filter((category) => category.parentId === null).map((category) => category.id);

  if (childIds.length > 0) await prisma.category.deleteMany({ where: { id: { in: childIds } } });
  if (rootIds.length > 0) await prisma.category.deleteMany({ where: { id: { in: rootIds } } });

  // AuthorProfile and RefreshToken rows cascade with the user.
  await prisma.user.deleteMany({ where: { email: { in: USER_EMAILS } } });
}

async function seedFixture(): Promise<Fixture> {
  const passwordHash = await hashPassword(STUDENT_PASSWORD);

  const admin1 = await prisma.user.create({
    data: { email: USER_EMAILS[0], fullName: 'Admin One', roles: [UserRole.ADMIN] },
  });
  const admin2 = await prisma.user.create({
    data: { email: USER_EMAILS[1], fullName: 'Admin Two', roles: [UserRole.ADMIN] },
  });
  const authorWithProfile = await prisma.user.create({
    data: { email: USER_EMAILS[2], fullName: 'Author With Profile', roles: [UserRole.AUTHOR] },
  });
  await prisma.authorProfile.create({
    data: { userId: authorWithProfile.id, displayName: 'Author With Profile' },
  });
  const authorNoProfile = await prisma.user.create({
    data: { email: USER_EMAILS[3], fullName: 'Author No Profile', roles: [UserRole.AUTHOR] },
  });
  const student = await prisma.user.create({
    data: { email: USER_EMAILS[4], fullName: 'Test Student', roles: [UserRole.STUDENT], passwordHash },
  });

  const rootCategory = await prisma.category.create({
    data: { slug: CATEGORY_SLUGS[0], nameUk: 'Коренева категорія' },
  });
  const childCategory = await prisma.category.create({
    data: { slug: CATEGORY_SLUGS[1], nameUk: 'Дочірня категорія', parentId: rootCategory.id },
  });
  const emptyCategory = await prisma.category.create({
    data: { slug: CATEGORY_SLUGS[2], nameUk: 'Порожня категорія' },
  });
  const altRootCategory = await prisma.category.create({
    data: { slug: CATEGORY_SLUGS[3], nameUk: 'Інша коренева категорія' },
  });

  await prisma.course.create({
    data: {
      authorId: authorWithProfile.id,
      categoryId: childCategory.id,
      type: ContentType.COURSE,
      status: CourseStatus.DRAFT,
      slug: `course-${randomUUID()}`,
      title: 'Курс у дочірній категорії',
      shortDescription: 'Короткий опис',
      description: 'Повний опис курсу',
    },
  });

  return {
    admin1Id: admin1.id,
    admin1Token: signAccessToken(admin1.id, admin1.roles),
    admin2Id: admin2.id,
    admin2Token: signAccessToken(admin2.id, admin2.roles),
    authorWithProfileId: authorWithProfile.id,
    authorNoProfileId: authorNoProfile.id,
    studentId: student.id,
    studentToken: signAccessToken(student.id, student.roles),
    rootCategoryId: rootCategory.id,
    childCategoryId: childCategory.id,
    emptyCategoryId: emptyCategory.id,
    altRootCategoryId: altRootCategory.id,
  };
}

describe('admin users and categories integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await redis.del(CATEGORY_TREE_CACHE_KEY);
    await prisma.$disconnect();
    await redis.quit();
  });

  // ---------------------------------------------------------------------
  // Users: status
  // ---------------------------------------------------------------------

  it('rejects a STUDENT on the status endpoint with 403', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .patch(`/api/admin/users/${fixture.authorNoProfileId}/status`)
      .set('Authorization', `Bearer ${fixture.studentToken}`)
      .send({ status: 'BLOCKED' });

    expect(res.status).toBe(403);
  });

  it('blocks a student, revokes their session and forbids login; unblocking restores it', async () => {
    const fixture = await seedFixture();

    const preBlockLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAILS[4], password: STUDENT_PASSWORD });
    expect(preBlockLogin.status).toBe(200);
    const staleRefreshToken = preBlockLogin.body.tokens.refreshToken as string;

    const block = await request(app)
      .patch(`/api/admin/users/${fixture.studentId}/status`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ status: 'BLOCKED' });
    expect(block.status).toBe(200);
    expect(block.body).toMatchObject({ id: fixture.studentId, status: 'BLOCKED' });

    const loginWhileBlocked = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAILS[4], password: STUDENT_PASSWORD });
    expect(loginWhileBlocked.status).toBe(403);

    const refreshWithStaleToken = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: staleRefreshToken });
    expect(refreshWithStaleToken.status).toBe(401);

    const repeatBlock = await request(app)
      .patch(`/api/admin/users/${fixture.studentId}/status`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ status: 'BLOCKED' });
    expect(repeatBlock.status).toBe(200);
    expect(repeatBlock.body.status).toBe('BLOCKED');

    const unblock = await request(app)
      .patch(`/api/admin/users/${fixture.studentId}/status`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ status: 'ACTIVE' });
    expect(unblock.status).toBe(200);
    expect(unblock.body.status).toBe('ACTIVE');

    const loginAfterUnblock = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAILS[4], password: STUDENT_PASSWORD });
    expect(loginAfterUnblock.status).toBe(200);
  });

  it('refuses to block an ADMIN account, including the caller themselves, with 409', async () => {
    const fixture = await seedFixture();

    const blockOtherAdmin = await request(app)
      .patch(`/api/admin/users/${fixture.admin2Id}/status`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ status: 'BLOCKED' });
    expect(blockOtherAdmin.status).toBe(409);

    const blockSelf = await request(app)
      .patch(`/api/admin/users/${fixture.admin1Id}/status`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ status: 'BLOCKED' });
    expect(blockSelf.status).toBe(409);
  });

  it('returns 404 for a non-existent user id on the status endpoint', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .patch(`/api/admin/users/${randomUUID()}/status`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ status: 'BLOCKED' });

    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------
  // Users: author verification
  // ---------------------------------------------------------------------

  it('verifies an author, keeps verifiedAt stable on a repeat call, and clears it on unverify', async () => {
    const fixture = await seedFixture();

    const verify = await request(app)
      .patch(`/api/admin/users/${fixture.authorWithProfileId}/verify-author`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ isVerified: true });
    expect(verify.status).toBe(200);
    expect(verify.body.isVerified).toBe(true);
    expect(verify.body.verifiedAt).not.toBeNull();
    const firstVerifiedAt = verify.body.verifiedAt as string;

    const repeat = await request(app)
      .patch(`/api/admin/users/${fixture.authorWithProfileId}/verify-author`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ isVerified: true });
    expect(repeat.status).toBe(200);
    expect(repeat.body.verifiedAt).toBe(firstVerifiedAt);

    const unverify = await request(app)
      .patch(`/api/admin/users/${fixture.authorWithProfileId}/verify-author`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ isVerified: false });
    expect(unverify.status).toBe(200);
    expect(unverify.body.isVerified).toBe(false);
    expect(unverify.body.verifiedAt).toBeNull();
  });

  it('returns 404 when verifying a user without an author profile', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .patch(`/api/admin/users/${fixture.authorNoProfileId}/verify-author`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ isVerified: true });

    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------

  it('creates a category and makes it visible in the public tree immediately', async () => {
    const fixture = await seedFixture();

    const warm = await request(app).get('/api/categories');
    expect(warm.status).toBe(200);

    const create = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ slug: CATEGORY_SLUGS[4], nameUk: 'Нова категорія' });
    expect(create.status).toBe(201);
    expect(create.body).toMatchObject({
      slug: CATEGORY_SLUGS[4],
      parentId: null,
      coursesCount: 0,
      childrenCount: 0,
      isActive: true,
    });

    const after = await request(app).get('/api/categories');
    expect(after.status).toBe(200);
    expect(collectSlugs(after.body.items)).toContain(CATEGORY_SLUGS[4]);
  });

  it('rejects a duplicate category slug with 409', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ slug: CATEGORY_SLUGS[1], nameUk: 'Дублікат слага' });

    expect(res.status).toBe(409);
  });

  it('rejects an invalid category slug with 400', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ slug: 'Invalid Slug!', nameUk: 'Категорія' });

    expect(res.status).toBe(400);
  });

  it('rejects a non-root parent on PATCH with 400', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .patch(`/api/admin/categories/${fixture.altRootCategoryId}`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({ parentId: fixture.childCategoryId });

    expect(res.status).toBe(400);
    expect(res.body.error.details?.[0]?.field).toBe('parentId');
  });

  it('rejects an empty PATCH body with 400', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .patch(`/api/admin/categories/${fixture.emptyCategoryId}`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('refuses to delete a category that still has courses with 409', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .delete(`/api/admin/categories/${fixture.childCategoryId}`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`);

    expect(res.status).toBe(409);
  });

  it('refuses to delete a category that still has subcategories with 409', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .delete(`/api/admin/categories/${fixture.rootCategoryId}`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`);

    expect(res.status).toBe(409);
  });

  it('deletes an empty category with 204', async () => {
    const fixture = await seedFixture();

    const res = await request(app)
      .delete(`/api/admin/categories/${fixture.emptyCategoryId}`)
      .set('Authorization', `Bearer ${fixture.admin1Token}`);

    expect(res.status).toBe(204);
  });
});

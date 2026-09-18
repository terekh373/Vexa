import { randomUUID } from 'node:crypto';
import {
  ContentType,
  CourseStatus,
  EnrollmentSource,
  OrderStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

const app = createApp();
const CATEGORY_SLUG = 'cart-orders-integration-category';

interface Fixture {
  authorId: string;
  buyerId: string;
  buyerToken: string;
  buyer2Id: string;
  buyer2Token: string;
  buyerAuthorId: string;
  buyerAuthorToken: string;
  course1Id: string;
  course1Price: number;
  course2Id: string;
  course2Price: number;
  draftCourseId: string;
  freeCourseId: string;
  deletedCourseId: string;
  usdCourseId: string;
  ownedCourseId: string;
  ownCourseId: string;
}

async function resetState(): Promise<void> {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixture(): Promise<Fixture> {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Тестова категорія кошика' },
  });

  const author = await prisma.user.create({
    data: {
      email: `cart-author-${randomUUID()}@example.com`,
      fullName: 'Cart Author',
      roles: [UserRole.AUTHOR],
    },
  });
  const buyer = await prisma.user.create({
    data: {
      email: `cart-buyer-${randomUUID()}@example.com`,
      fullName: 'Cart Buyer',
      roles: [UserRole.STUDENT],
    },
  });
  const buyer2 = await prisma.user.create({
    data: {
      email: `cart-buyer2-${randomUUID()}@example.com`,
      fullName: 'Second Buyer',
      roles: [UserRole.STUDENT],
    },
  });
  const buyerAuthor = await prisma.user.create({
    data: {
      email: `cart-buyer-author-${randomUUID()}@example.com`,
      fullName: 'Buyer Author',
      roles: [UserRole.STUDENT, UserRole.AUTHOR],
    },
  });

  const baseCourse = {
    authorId: author.id,
    categoryId: category.id,
    type: ContentType.COURSE,
    shortDescription: 'Короткий опис',
    description: 'Повний опис',
  };

  const course1 = await prisma.course.create({
    data: {
      ...baseCourse,
      status: CourseStatus.PUBLISHED,
      slug: `cart-course-1-${randomUUID()}`,
      title: 'Курс 1',
      priceAmount: 29_900,
      publishedAt: new Date(),
    },
  });
  const course2 = await prisma.course.create({
    data: {
      ...baseCourse,
      status: CourseStatus.PUBLISHED,
      slug: `cart-course-2-${randomUUID()}`,
      title: 'Курс 2',
      priceAmount: 19_900,
      publishedAt: new Date(),
    },
  });
  const draftCourse = await prisma.course.create({
    data: {
      ...baseCourse,
      status: CourseStatus.DRAFT,
      slug: `cart-course-draft-${randomUUID()}`,
      title: 'Курс-чернетка',
      priceAmount: 9_900,
    },
  });
  const freeCourse = await prisma.course.create({
    data: {
      ...baseCourse,
      status: CourseStatus.PUBLISHED,
      slug: `cart-course-free-${randomUUID()}`,
      title: 'Безкоштовний курс',
      priceAmount: 0,
      publishedAt: new Date(),
    },
  });
  const deletedCourse = await prisma.course.create({
    data: {
      ...baseCourse,
      status: CourseStatus.PUBLISHED,
      slug: `cart-course-deleted-${randomUUID()}`,
      title: 'Видалений курс',
      priceAmount: 9_900,
      publishedAt: new Date(),
      deletedAt: new Date(),
    },
  });
  const usdCourse = await prisma.course.create({
    data: {
      ...baseCourse,
      status: CourseStatus.PUBLISHED,
      slug: `cart-course-usd-${randomUUID()}`,
      title: 'Курс у доларах',
      priceAmount: 9_900,
      currency: 'USD',
      publishedAt: new Date(),
    },
  });
  const ownedCourse = await prisma.course.create({
    data: {
      ...baseCourse,
      status: CourseStatus.PUBLISHED,
      slug: `cart-course-owned-${randomUUID()}`,
      title: 'Уже придбаний курс',
      priceAmount: 9_900,
      publishedAt: new Date(),
    },
  });
  const ownCourse = await prisma.course.create({
    data: {
      ...baseCourse,
      authorId: buyerAuthor.id,
      status: CourseStatus.PUBLISHED,
      slug: `cart-course-own-${randomUUID()}`,
      title: 'Власний курс',
      priceAmount: 9_900,
      publishedAt: new Date(),
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: buyer.id,
      courseId: ownedCourse.id,
      source: EnrollmentSource.ADMIN_GRANT,
    },
  });

  return {
    authorId: author.id,
    buyerId: buyer.id,
    buyerToken: signAccessToken(buyer.id, buyer.roles),
    buyer2Id: buyer2.id,
    buyer2Token: signAccessToken(buyer2.id, buyer2.roles),
    buyerAuthorId: buyerAuthor.id,
    buyerAuthorToken: signAccessToken(buyerAuthor.id, buyerAuthor.roles),
    course1Id: course1.id,
    course1Price: course1.priceAmount,
    course2Id: course2.id,
    course2Price: course2.priceAmount,
    draftCourseId: draftCourse.id,
    freeCourseId: freeCourse.id,
    deletedCourseId: deletedCourse.id,
    usdCourseId: usdCourse.id,
    ownedCourseId: ownedCourse.id,
    ownCourseId: ownCourse.id,
  };
}

describe('cart and orders integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('requires authentication for the cart', async () => {
    await seedFixture();

    const response = await request(app).get('/api/cart');
    expect(response.status).toBe(401);
  });

  it('adds courses, ignores duplicates and blocks courses that cannot be purchased', async () => {
    const fixture = await seedFixture();

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.course1Id })
      .expect(200);

    const afterSecondAdd = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.course2Id });
    expect(afterSecondAdd.status).toBe(200);
    expect(afterSecondAdd.body.itemsCount).toBe(2);
    expect(afterSecondAdd.body.totalAmount).toBe(fixture.course1Price + fixture.course2Price);
    expect(afterSecondAdd.body.items.every((item: { isAvailable: boolean }) => item.isAvailable)).toBe(true);

    const duplicate = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.course1Id });
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.itemsCount).toBe(2);

    const blockedCourseIds = [
      fixture.draftCourseId,
      fixture.freeCourseId,
      fixture.usdCourseId,
      fixture.ownedCourseId,
    ];
    for (const courseId of blockedCourseIds) {
      const blocked = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${fixture.buyerToken}`)
        .send({ courseId });
      expect(blocked.status).toBe(409);
      expect(blocked.body.error.details[0].field).toBe('courseId');
    }

    const ownCourseBlocked = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerAuthorToken}`)
      .send({ courseId: fixture.ownCourseId });
    expect(ownCourseBlocked.status).toBe(409);
    expect(ownCourseBlocked.body.error.details[0].field).toBe('courseId');

    const missing = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: randomUUID() });
    expect(missing.status).toBe(404);

    const deleted = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.deletedCourseId });
    expect(deleted.status).toBe(404);

    const finalCart = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${fixture.buyerToken}`);
    expect(finalCart.body.itemsCount).toBe(2);
  });

  it('removes a cart item and a repeated removal is a no-op', async () => {
    const fixture = await seedFixture();

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.course1Id })
      .expect(200);

    const removed = await request(app)
      .delete(`/api/cart/items/${fixture.course1Id}`)
      .set('Authorization', `Bearer ${fixture.buyerToken}`);
    expect(removed.status).toBe(200);
    expect(removed.body.itemsCount).toBe(0);

    const removedAgain = await request(app)
      .delete(`/api/cart/items/${fixture.course1Id}`)
      .set('Authorization', `Bearer ${fixture.buyerToken}`);
    expect(removedAgain.status).toBe(200);
    expect(removedAgain.body.itemsCount).toBe(0);
  });

  it('creates an order from the cart without opening access or filling the commission split', async () => {
    const fixture = await seedFixture();

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.course1Id })
      .expect(200);
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.course2Id })
      .expect(200);

    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send();

    expect(created.status).toBe(201);
    expect(created.body.status).toBe('PENDING');
    expect(created.body.totalAmount).toBe(fixture.course1Price + fixture.course2Price);
    expect(created.body.items).toHaveLength(2);
    expect(created.body).not.toHaveProperty('commissionRateBps');
    expect(created.body).not.toHaveProperty('commissionAmount');
    expect(created.body).not.toHaveProperty('authorAmount');
    for (const item of created.body.items as Record<string, unknown>[]) {
      expect(item).not.toHaveProperty('commissionRateBps');
      expect(item).not.toHaveProperty('commissionAmount');
      expect(item).not.toHaveProperty('authorAmount');
    }

    const orderItems = await prisma.orderItem.findMany({ where: { orderId: created.body.id as string } });
    expect(orderItems).toHaveLength(2);
    for (const item of orderItems) {
      expect(item.commissionRateBps).toBeNull();
      expect(item.commissionAmount).toBeNull();
      expect(item.authorAmount).toBeNull();
    }

    const cart = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${fixture.buyerToken}`);
    expect(cart.body.itemsCount).toBe(0);

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: fixture.buyerId, courseId: { in: [fixture.course1Id, fixture.course2Id] } },
    });
    expect(enrollments).toHaveLength(0);
  });

  it('rejects order creation with an empty cart', async () => {
    const fixture = await seedFixture();

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send();
    expect(response.status).toBe(409);
  });

  it('excludes an unpublished course from cart totals and blocks order creation', async () => {
    const fixture = await seedFixture();

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.course1Id })
      .expect(200);

    await prisma.course.update({
      where: { id: fixture.course1Id },
      data: { status: CourseStatus.UNPUBLISHED },
    });

    const cart = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${fixture.buyerToken}`);
    expect(cart.status).toBe(200);
    expect(cart.body.items[0].isAvailable).toBe(false);
    expect(cart.body.totalAmount).toBe(0);

    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send();
    expect(order.status).toBe(409);
    expect(order.body.error.details.some((detail: { field: string }) => detail.field === fixture.course1Id)).toBe(
      true,
    );

    expect(await prisma.order.count()).toBe(0);
    const cartAfter = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${fixture.buyerToken}`);
    expect(cartAfter.body.itemsCount).toBe(1);
  });

  it('cancels the previous pending order when a new order is created', async () => {
    const fixture = await seedFixture();

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.course1Id })
      .expect(200);
    const first = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send();
    expect(first.status).toBe(201);

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.course2Id })
      .expect(200);
    const second = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send();
    expect(second.status).toBe(201);

    const firstOrder = await prisma.order.findUniqueOrThrow({ where: { id: first.body.id as string } });
    expect(firstOrder.status).toBe(OrderStatus.CANCELLED);
    expect(firstOrder.cancelledAt).not.toBeNull();
  });

  it('lists and fetches only the caller own orders', async () => {
    const fixture = await seedFixture();

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send({ courseId: fixture.course1Id })
      .expect(200);
    const order1 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${fixture.buyerToken}`)
      .send();
    expect(order1.status).toBe(201);

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${fixture.buyer2Token}`)
      .send({ courseId: fixture.course2Id })
      .expect(200);
    const order2 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${fixture.buyer2Token}`)
      .send();
    expect(order2.status).toBe(201);

    const list = await request(app)
      .get('/api/me/orders')
      .set('Authorization', `Bearer ${fixture.buyerToken}`);
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].id).toBe(order1.body.id);
    expect(list.body).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });

    const own = await request(app)
      .get(`/api/me/orders/${order1.body.id}`)
      .set('Authorization', `Bearer ${fixture.buyerToken}`);
    expect(own.status).toBe(200);
    expect(own.body.id).toBe(order1.body.id);

    const foreign = await request(app)
      .get(`/api/me/orders/${order2.body.id}`)
      .set('Authorization', `Bearer ${fixture.buyerToken}`);
    expect(foreign.status).toBe(404);
  });
});

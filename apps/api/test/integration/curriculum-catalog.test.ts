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
const PREFIX = 'curriculum-catalog-it';
const CATEGORY_SLUG = `${PREFIX}-category`;
const CURRICULUM_CACHE_KEY = 'curriculum:tree:v1';

interface Fixture {
  subjectSlug: string;
  subjectId: string;
  otherSubjectId: string;
  topic9aId: string;
  topic9bId: string;
  topic10Id: string;
  topicNullId: string;
  otherTopicId: string;
  courseAId: string;
  courseBId: string;
  courseCId: string;
  courseDId: string;
  moderationCourseId: string;
  authorToken: string;
  categoryId: string;
  authorId: string;
}

// Scoped to this file's own rows: deleting Course cascades CourseTopic and
// Module, and deleting CurriculumSubject cascades CurriculumTopic, so the
// order is courses -> subjects -> users -> category.
async function resetState(): Promise<void> {
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.curriculumSubject.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
  await redis.del(CURRICULUM_CACHE_KEY);
}

async function seedFixture(): Promise<Fixture> {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Тестова категорія програми' },
  });

  const author = await prisma.user.create({
    data: {
      email: `${PREFIX}-author-${randomUUID()}@example.com`,
      fullName: 'Curriculum Author',
      roles: [UserRole.STUDENT, UserRole.AUTHOR],
      status: UserStatus.ACTIVE,
    },
  });
  await prisma.authorProfile.create({
    data: { userId: author.id, displayName: 'Curriculum Author' },
  });

  // "Англійська" sorts before "Математика" in Ukrainian collation, so the
  // fixture's second subject is expected first in the tree.
  const subject = await prisma.curriculumSubject.create({
    data: { slug: `${PREFIX}-math-${randomUUID()}`, nameUk: 'Тестова математика' },
  });
  const otherSubject = await prisma.curriculumSubject.create({
    data: { slug: `${PREFIX}-english-${randomUUID()}`, nameUk: 'Тестова англійська' },
  });

  const topic9a = await prisma.curriculumTopic.create({
    data: { subjectId: subject.id, grade: 9, title: 'Квадратні рівняння', sortOrder: 2 },
  });
  const topic9b = await prisma.curriculumTopic.create({
    data: { subjectId: subject.id, grade: 9, title: 'Нерівності', sortOrder: 1 },
  });
  const topic10 = await prisma.curriculumTopic.create({
    data: { subjectId: subject.id, grade: 10, title: 'Функції', sortOrder: 1 },
  });
  const topicNull = await prisma.curriculumTopic.create({
    data: { subjectId: subject.id, grade: null, title: 'Підготовка до НМТ', sortOrder: 1 },
  });
  const otherTopic = await prisma.curriculumTopic.create({
    data: { subjectId: otherSubject.id, grade: 7, title: 'Present Perfect', sortOrder: 1 },
  });

  async function createCourse(data: {
    title: string;
    status: CourseStatus;
    grade?: number;
    studentsCount?: number;
    deletedAt?: Date;
  }) {
    return prisma.course.create({
      data: {
        authorId: author.id,
        categoryId: category.id,
        type: ContentType.COURSE,
        slug: `${PREFIX}-${randomUUID()}`,
        shortDescription: 'Короткий опис',
        description: 'Повний опис',
        publishedAt: data.status === CourseStatus.PUBLISHED ? new Date() : null,
        ...data,
      },
    });
  }

  const courseA = await createCourse({
    title: 'Квадратні рівняння для 9 класу',
    status: CourseStatus.PUBLISHED,
    grade: 9,
  });
  const courseB = await createCourse({
    title: 'Англійська граматика для початківців',
    status: CourseStatus.PUBLISHED,
  });
  const courseC = await createCourse({
    title: 'Квадратні рівняння (чернетка)',
    status: CourseStatus.DRAFT,
    grade: 9,
  });
  const courseD = await createCourse({
    title: 'Квадратні рівняння (видалений)',
    status: CourseStatus.PUBLISHED,
    grade: 9,
    deletedAt: new Date(),
  });
  const moderationCourse = await createCourse({
    title: 'Курс на модерації',
    status: CourseStatus.MODERATION,
  });

  await prisma.courseTopic.createMany({
    data: [
      { courseId: courseA.id, topicId: topic9a.id },
      { courseId: courseA.id, topicId: topic10.id },
      { courseId: courseB.id, topicId: otherTopic.id },
      { courseId: courseC.id, topicId: topic9a.id },
      { courseId: courseD.id, topicId: topic9a.id },
    ],
  });

  return {
    subjectSlug: subject.slug,
    subjectId: subject.id,
    otherSubjectId: otherSubject.id,
    topic9aId: topic9a.id,
    topic9bId: topic9b.id,
    topic10Id: topic10.id,
    topicNullId: topicNull.id,
    otherTopicId: otherTopic.id,
    courseAId: courseA.id,
    courseBId: courseB.id,
    courseCId: courseC.id,
    courseDId: courseD.id,
    moderationCourseId: moderationCourse.id,
    authorToken: signAccessToken(author.id, author.roles),
    categoryId: category.id,
    authorId: author.id,
  };
}

function ids(items: { id: string }[]): string[] {
  return items.map((item) => item.id);
}

describe('curriculum, catalog filters, topics and suggestions integration', () => {
  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('GET /api/curriculum', () => {
    it('returns subject -> grade -> topic with the documented ordering', async () => {
      const fixture = await seedFixture();

      const response = await request(app).get('/api/curriculum');

      expect(response.status).toBe(200);
      const subjects: {
        id: string;
        nameUk: string;
        grades: { grade: number | null; topics: { id: string }[] }[];
      }[] = response.body.items;

      expect(subjects.map((subject) => subject.id)).toEqual([
        fixture.otherSubjectId,
        fixture.subjectId,
      ]);

      const math = subjects[1];
      expect(math?.grades.map((grade) => grade.grade)).toEqual([9, 10, null]);
      // sortOrder wins over title: "Нерівності" (1) before "Квадратні рівняння" (2).
      expect(ids(math?.grades[0]?.topics ?? [])).toEqual([fixture.topic9bId, fixture.topic9aId]);
      expect(ids(math?.grades[1]?.topics ?? [])).toEqual([fixture.topic10Id]);
      expect(ids(math?.grades[2]?.topics ?? [])).toEqual([fixture.topicNullId]);
    });

    it('serves the cached tree until the key is dropped', async () => {
      const fixture = await seedFixture();

      const first = await request(app).get('/api/curriculum');
      expect(first.status).toBe(200);

      const added = await prisma.curriculumTopic.create({
        data: { subjectId: fixture.subjectId, grade: 11, title: 'Стереометрія', sortOrder: 1 },
      });

      const cached = await request(app).get('/api/curriculum');
      expect(cached.body).toEqual(first.body);

      await redis.del(CURRICULUM_CACHE_KEY);

      const refreshed = await request(app).get('/api/curriculum');
      expect(JSON.stringify(refreshed.body)).toContain(added.id);
    });
  });

  describe('GET /api/courses filters', () => {
    it('filters by subject and returns only published, non-deleted courses', async () => {
      const fixture = await seedFixture();

      const response = await request(app).get(`/api/courses?subject=${fixture.subjectSlug}`);

      expect(response.status).toBe(200);
      expect(ids(response.body.items)).toEqual([fixture.courseAId]);
    });

    it('filters by topic', async () => {
      const fixture = await seedFixture();

      const response = await request(app).get(`/api/courses?topic=${fixture.topic9aId}`);

      expect(response.status).toBe(200);
      expect(ids(response.body.items)).toEqual([fixture.courseAId]);

      const other = await request(app).get(`/api/courses?topic=${fixture.otherTopicId}`);
      expect(ids(other.body.items)).toEqual([fixture.courseBId]);
    });

    it('combines subject with the course grade', async () => {
      const fixture = await seedFixture();

      const match = await request(app).get(`/api/courses?subject=${fixture.subjectSlug}&grade=9`);
      expect(ids(match.body.items)).toEqual([fixture.courseAId]);

      const miss = await request(app).get(`/api/courses?subject=${fixture.subjectSlug}&grade=5`);
      expect(miss.status).toBe(200);
      expect(miss.body.items).toEqual([]);
    });

    it('answers an unknown subject with an empty list', async () => {
      await seedFixture();

      const response = await request(app).get('/api/courses?subject=no-such-subject');

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('rejects a topic that is not a uuid', async () => {
      const response = await request(app).get('/api/courses?topic=abc');

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/author/courses/:id topicIds', () => {
    function patch(fixture: Fixture, courseId: string, body: object) {
      return request(app)
        .patch(`/api/author/courses/${courseId}`)
        .set('Authorization', `Bearer ${fixture.authorToken}`)
        .send(body);
    }

    async function topicsOf(fixture: Fixture, courseId: string): Promise<string[]> {
      const response = await request(app)
        .get(`/api/author/courses/${courseId}`)
        .set('Authorization', `Bearer ${fixture.authorToken}`);
      expect(response.status).toBe(200);
      const topics: { topic: { id: string } }[] = response.body.topics;
      return topics.map((entry) => entry.topic.id).sort();
    }

    it('attaches topics of one subject and shows them on the course', async () => {
      const fixture = await seedFixture();

      const response = await patch(fixture, fixture.courseCId, {
        topicIds: [fixture.topic9bId, fixture.topic10Id],
      });

      expect(response.status).toBe(200);
      expect(await topicsOf(fixture, fixture.courseCId)).toEqual(
        [fixture.topic9bId, fixture.topic10Id].sort(),
      );
    });

    it('rejects topics of two different subjects', async () => {
      const fixture = await seedFixture();

      const response = await patch(fixture, fixture.courseCId, {
        topicIds: [fixture.topic9aId, fixture.otherTopicId],
      });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual([
        { field: 'topicIds', message: 'Теми мають належати одному предмету' },
      ]);
    });

    it('rejects a topic id that does not exist', async () => {
      const fixture = await seedFixture();

      const response = await patch(fixture, fixture.courseCId, {
        topicIds: [fixture.topic9aId, randomUUID()],
      });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual([
        { field: 'topicIds', message: 'Одна або кілька тем не існують' },
      ]);
    });

    it('rejects more than 10 topics', async () => {
      const fixture = await seedFixture();

      const response = await patch(fixture, fixture.courseCId, {
        topicIds: Array.from({ length: 11 }, () => randomUUID()),
      });

      expect(response.status).toBe(400);
    });

    it('rejects a repeated topic id', async () => {
      const fixture = await seedFixture();

      const response = await patch(fixture, fixture.courseCId, {
        topicIds: [fixture.topic9aId, fixture.topic9aId],
      });

      expect(response.status).toBe(400);
    });

    it('detaches every topic with an empty array', async () => {
      const fixture = await seedFixture();

      const response = await patch(fixture, fixture.courseCId, { topicIds: [] });

      expect(response.status).toBe(200);
      expect(await topicsOf(fixture, fixture.courseCId)).toEqual([]);
    });

    it('refuses to change topics of a course under moderation', async () => {
      const fixture = await seedFixture();

      const response = await patch(fixture, fixture.moderationCourseId, {
        topicIds: [fixture.topic9aId],
      });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/courses/suggest', () => {
    async function suggest(q?: string) {
      const query = q === undefined ? '' : `?q=${encodeURIComponent(q)}`;
      return request(app).get(`/api/courses/suggest${query}`);
    }

    it('requires q of at least two characters', async () => {
      expect((await suggest()).status).toBe(400);
      expect((await suggest('а')).status).toBe(400);
    });

    it('puts a title that starts with the query first', async () => {
      const fixture = await seedFixture();
      // Contains the query mid-title and is far more popular: the prefix match must still win.
      await prisma.course.create({
        data: {
          authorId: fixture.authorId,
          categoryId: fixture.categoryId,
          type: ContentType.MATERIAL,
          status: CourseStatus.PUBLISHED,
          slug: `${PREFIX}-${randomUUID()}`,
          title: 'Основи: квадратні функції',
          shortDescription: 'Короткий опис',
          description: 'Повний опис',
          studentsCount: 1000,
          publishedAt: new Date(),
        },
      });

      const response = await suggest('квадратні');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0]).toEqual({
        id: fixture.courseAId,
        slug: expect.any(String),
        title: 'Квадратні рівняння для 9 класу',
        type: 'course',
      });
      expect(response.body.items[1].type).toBe('material');
    });

    it('finds a course despite a typo in the query', async () => {
      const fixture = await seedFixture();

      const response = await suggest('квадратни');

      expect(response.status).toBe(200);
      expect(ids(response.body.items)).toContain(fixture.courseAId);
    });

    it('finds a course when a letter is missing from the query', async () => {
      const fixture = await seedFixture();

      const response = await suggest('рівнння');

      expect(response.status).toBe(200);
      expect(ids(response.body.items)).toContain(fixture.courseAId);
    });

    it('never returns drafts or deleted courses', async () => {
      const fixture = await seedFixture();

      for (const q of ['квадратні', 'квадратни', 'чернетка', 'видалений']) {
        const response = await suggest(q);
        const found = ids(response.body.items);

        expect(found).not.toContain(fixture.courseCId);
        expect(found).not.toContain(fixture.courseDId);
      }
    });

    it('returns exactly 8 of 10 matching published courses', async () => {
      const fixture = await seedFixture();
      await prisma.course.createMany({
        data: Array.from({ length: 10 }, (_, index) => ({
          authorId: fixture.authorId,
          categoryId: fixture.categoryId,
          type: ContentType.COURSE,
          status: CourseStatus.PUBLISHED,
          slug: `${PREFIX}-${randomUUID()}`,
          title: `Тригонометрія: урок ${index + 1}`,
          shortDescription: 'Короткий опис',
          description: 'Повний опис',
          publishedAt: new Date(),
        })),
      });

      const response = await suggest('Тригонометрія');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(8);
    });

    it('treats LIKE wildcards literally', async () => {
      await seedFixture();

      const response = await suggest('%%');

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
    });
  });
});

import { randomUUID } from 'node:crypto';
import {
  ContentType,
  CourseStatus,
  FileKind,
  LessonType,
  StorageProvider,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { AppError } from '../../src/lib/errors.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';
import {
  createStreamDirectUpload,
  getStreamVideo,
  isStreamApiConfigured,
  type StreamVideoStatus,
} from '../../src/lib/stream-api.js';
import { signAccessToken } from '../../src/modules/auth/token.service.js';

vi.mock('../../src/lib/stream-api.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/stream-api.js')>()),
  isStreamApiConfigured: vi.fn(() => true),
  createStreamDirectUpload: vi.fn(),
  getStreamVideo: vi.fn(),
}));

const app = createApp();
const CATEGORY_SLUG = 'files-video-integration-category';
const EMAIL_PREFIX = 'files-video-';
const MB = 1024 * 1024;

interface Fixture {
  authorId: string;
  lessonId: string;
  authorToken: string;
  otherAuthorToken: string;
  studentToken: string;
}

function videoStatus(overrides: Partial<StreamVideoStatus>): StreamVideoStatus {
  return {
    state: 'ready',
    readyToStream: true,
    durationSec: 612,
    errorReasonCode: null,
    errorReasonText: null,
    ...overrides,
  };
}

async function resetState(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  // Course -> Module -> Lesson cascade, and the lesson's videoFileId link goes
  // with it, so files can be removed afterwards.
  await prisma.course.deleteMany({ where: { authorId: { in: userIds } } });
  await prisma.file.deleteMany({ where: { uploadedById: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixture(): Promise<Fixture> {
  const category = await prisma.category.create({
    data: { slug: CATEGORY_SLUG, nameUk: 'Категорія відео-тестів' },
  });

  const author = await prisma.user.create({
    data: {
      email: `${EMAIL_PREFIX}author-${randomUUID()}@example.com`,
      fullName: 'Video Author',
      roles: [UserRole.STUDENT, UserRole.AUTHOR],
    },
  });
  const otherAuthor = await prisma.user.create({
    data: {
      email: `${EMAIL_PREFIX}other-${randomUUID()}@example.com`,
      fullName: 'Other Author',
      roles: [UserRole.STUDENT, UserRole.AUTHOR],
    },
  });
  const student = await prisma.user.create({
    data: {
      email: `${EMAIL_PREFIX}student-${randomUUID()}@example.com`,
      fullName: 'Video Student',
      roles: [UserRole.STUDENT],
    },
  });

  const course = await prisma.course.create({
    data: {
      authorId: author.id,
      categoryId: category.id,
      type: ContentType.COURSE,
      status: CourseStatus.DRAFT,
      slug: `files-video-course-${randomUUID()}`,
      title: 'Курс для тесту відео',
      shortDescription: 'Короткий опис',
      description: 'Повний опис',
      priceAmount: 20_000,
    },
  });
  const courseModule = await prisma.module.create({
    data: { courseId: course.id, title: 'Модуль 1', sortOrder: 0 },
  });
  const lesson = await prisma.lesson.create({
    data: { moduleId: courseModule.id, type: LessonType.VIDEO, title: 'Відеоурок', sortOrder: 0 },
  });

  return {
    authorId: author.id,
    lessonId: lesson.id,
    authorToken: signAccessToken(author.id, author.roles),
    otherAuthorToken: signAccessToken(otherAuthor.id, otherAuthor.roles),
    studentToken: signAccessToken(student.id, student.roles),
  };
}

const validBody = { originalName: 'lesson.mp4', mimeType: 'video/mp4', sizeBytes: 50 * MB };

async function createUpload(fixture: Fixture): Promise<string> {
  vi.mocked(createStreamDirectUpload).mockResolvedValue({
    uid: `uid-${randomUUID()}`,
    uploadUrl: 'https://upload.example.com/one-time',
  });

  const response = await request(app)
    .post('/api/files/video-upload-url')
    .set('Authorization', `Bearer ${fixture.authorToken}`)
    .send(validBody);
  expect(response.status).toBe(201);

  return response.body.fileId;
}

function confirm(token: string, fileId: string) {
  return request(app).post(`/api/files/${fileId}/confirm`).set('Authorization', `Bearer ${token}`);
}

describe('video upload integration', () => {
  beforeEach(async () => {
    vi.mocked(isStreamApiConfigured).mockReset().mockReturnValue(true);
    vi.mocked(createStreamDirectUpload).mockReset();
    vi.mocked(getStreamVideo).mockReset();
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('POST /api/files/video-upload-url', () => {
    it('requires authentication', async () => {
      const response = await request(app).post('/api/files/video-upload-url').send(validBody);
      expect(response.status).toBe(401);
    });

    it('rejects a student with 403', async () => {
      const fixture = await seedFixture();

      const response = await request(app)
        .post('/api/files/video-upload-url')
        .set('Authorization', `Bearer ${fixture.studentToken}`)
        .send(validBody);
      expect(response.status).toBe(403);
    });

    it('rejects an unsupported type with 400', async () => {
      const fixture = await seedFixture();

      const response = await request(app)
        .post('/api/files/video-upload-url')
        .set('Authorization', `Bearer ${fixture.authorToken}`)
        .send({ ...validBody, mimeType: 'image/png' });
      expect(response.status).toBe(400);
      expect(createStreamDirectUpload).not.toHaveBeenCalled();
    });

    it('rejects a file over 200 MB with 400', async () => {
      const fixture = await seedFixture();

      const response = await request(app)
        .post('/api/files/video-upload-url')
        .set('Authorization', `Bearer ${fixture.authorToken}`)
        .send({ ...validBody, sizeBytes: 200 * MB + 1 });
      expect(response.status).toBe(400);
    });

    it('answers 503 when the Stream API is not configured', async () => {
      const fixture = await seedFixture();
      vi.mocked(isStreamApiConfigured).mockReturnValue(false);

      const response = await request(app)
        .post('/api/files/video-upload-url')
        .set('Authorization', `Bearer ${fixture.authorToken}`)
        .send(validBody);
      expect(response.status).toBe(503);
      expect(createStreamDirectUpload).not.toHaveBeenCalled();
    });

    it('answers 503 when Stream is unavailable and leaves no row behind', async () => {
      const fixture = await seedFixture();
      vi.mocked(createStreamDirectUpload).mockRejectedValue(
        AppError.serviceUnavailable('Video service is unavailable'),
      );

      const response = await request(app)
        .post('/api/files/video-upload-url')
        .set('Authorization', `Bearer ${fixture.authorToken}`)
        .send(validBody);
      expect(response.status).toBe(503);
      expect(await prisma.file.count({ where: { uploadedById: fixture.authorId } })).toBe(0);
    });

    it('issues an upload link and records a pending Stream video', async () => {
      const fixture = await seedFixture();
      vi.mocked(createStreamDirectUpload).mockResolvedValue({
        uid: 'stream-uid-1',
        uploadUrl: 'https://upload.example.com/one-time',
      });

      const response = await request(app)
        .post('/api/files/video-upload-url')
        .set('Authorization', `Bearer ${fixture.authorToken}`)
        .send(validBody);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        fileId: expect.any(String),
        uploadUrl: 'https://upload.example.com/one-time',
      });
      expect(createStreamDirectUpload).toHaveBeenCalledWith({
        maxDurationSeconds: 3600,
        creator: fixture.authorId,
      });

      const row = await prisma.file.findUniqueOrThrow({ where: { id: response.body.fileId } });
      expect(row).toMatchObject({
        uploadedById: fixture.authorId,
        kind: FileKind.VIDEO,
        provider: StorageProvider.CLOUDFLARE_STREAM,
        storageKey: 'stream-uid-1',
        isReady: false,
      });
    });
  });

  describe('POST /api/files/:id/confirm for a video', () => {
    it('rejects another author with 403', async () => {
      const fixture = await seedFixture();
      const fileId = await createUpload(fixture);

      const response = await confirm(fixture.otherAuthorToken, fileId);
      expect(response.status).toBe(403);
      expect(getStreamVideo).not.toHaveBeenCalled();
    });

    it('answers 409 when Stream does not know the video', async () => {
      const fixture = await seedFixture();
      const fileId = await createUpload(fixture);
      vi.mocked(getStreamVideo).mockResolvedValue(null);

      const response = await confirm(fixture.authorToken, fileId);
      expect(response.status).toBe(409);
    });

    it('answers 409 while the upload has not arrived', async () => {
      const fixture = await seedFixture();
      const fileId = await createUpload(fixture);
      vi.mocked(getStreamVideo).mockResolvedValue(
        videoStatus({ state: 'pendingupload', readyToStream: false, durationSec: null }),
      );

      const response = await confirm(fixture.authorToken, fileId);
      expect(response.status).toBe(409);
    });

    it('answers 202 while Stream is still processing', async () => {
      const fixture = await seedFixture();
      const fileId = await createUpload(fixture);
      vi.mocked(getStreamVideo).mockResolvedValue(
        videoStatus({ state: 'inprogress', readyToStream: false, durationSec: null }),
      );

      const response = await confirm(fixture.authorToken, fileId);
      expect(response.status).toBe(202);
      expect(response.body.file).toMatchObject({ id: fileId, isReady: false });
    });

    it('answers 409 with the reason when processing failed', async () => {
      const fixture = await seedFixture();
      const fileId = await createUpload(fixture);
      vi.mocked(getStreamVideo).mockResolvedValue(
        videoStatus({
          state: 'error',
          readyToStream: false,
          durationSec: null,
          errorReasonCode: 'ERR_NON_VIDEO',
          errorReasonText: 'The upload is not a video.',
        }),
      );

      const response = await confirm(fixture.authorToken, fileId);
      expect(response.status).toBe(409);
      expect(response.body.error.details).toEqual([{ field: 'video', message: 'The upload is not a video.' }]);
    });

    it('marks a ready video, stores its duration and skips Stream on a repeat', async () => {
      const fixture = await seedFixture();
      const fileId = await createUpload(fixture);
      vi.mocked(getStreamVideo).mockResolvedValue(videoStatus({}));

      const first = await confirm(fixture.authorToken, fileId);
      expect(first.status).toBe(200);
      expect(first.body.file.isReady).toBe(true);

      const row = await prisma.file.findUniqueOrThrow({ where: { id: fileId } });
      expect(row).toMatchObject({ isReady: true, durationSec: 612 });

      const second = await confirm(fixture.authorToken, fileId);
      expect(second.status).toBe(200);
      expect(getStreamVideo).toHaveBeenCalledTimes(1);
    });
  });

  describe('linking to a lesson', () => {
    it('refuses a video that is not ready and accepts it afterwards', async () => {
      const fixture = await seedFixture();
      const fileId = await createUpload(fixture);

      const early = await request(app)
        .patch(`/api/author/lessons/${fixture.lessonId}`)
        .set('Authorization', `Bearer ${fixture.authorToken}`)
        .send({ videoFileId: fileId });
      expect(early.status).toBe(404);

      vi.mocked(getStreamVideo).mockResolvedValue(videoStatus({}));
      expect((await confirm(fixture.authorToken, fileId)).status).toBe(200);

      const linked = await request(app)
        .patch(`/api/author/lessons/${fixture.lessonId}`)
        .set('Authorization', `Bearer ${fixture.authorToken}`)
        .send({ videoFileId: fileId });
      expect(linked.status).toBe(200);

      const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: fixture.lessonId } });
      expect(lesson).toMatchObject({ videoFileId: fileId, durationSec: 612 });
    });
  });

  describe('GET /api/files/:id/download-url for a video', () => {
    it('answers 409: videos are streamed, not downloaded', async () => {
      const fixture = await seedFixture();
      const fileId = await createUpload(fixture);
      vi.mocked(getStreamVideo).mockResolvedValue(videoStatus({}));
      expect((await confirm(fixture.authorToken, fileId)).status).toBe(200);

      const response = await request(app)
        .get(`/api/files/${fileId}/download-url`)
        .set('Authorization', `Bearer ${fixture.authorToken}`);
      expect(response.status).toBe(409);
    });
  });
});

import {
  CourseStatus,
  FileKind,
  ModerationAction,
  type Prisma,
} from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type {
  AuthorCourseListQuery,
  CreateCourseInput,
  CreateLessonInput,
  CreateModuleInput,
  ReorderCourseInput,
  UpdateCourseInput,
  UpdateLessonInput,
  UpdateModuleInput,
} from './author.validation.js';

const EDITABLE_STATUSES = new Set<CourseStatus>([CourseStatus.DRAFT, CourseStatus.REJECTED]);

type DbClient = Prisma.TransactionClient | typeof prisma;

const courseListSelect = {
  id: true,
  type: true,
  status: true,
  slug: true,
  title: true,
  shortDescription: true,
  categoryId: true,
  coverFileId: true,
  language: true,
  grade: true,
  priceAmount: true,
  currency: true,
  lessonsCount: true,
  durationSec: true,
  submittedAt: true,
  publishedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CourseSelect;

const fullCourseSelect = {
  ...courseListSelect,
  description: true,
  outcomes: true,
  category: {
    select: {
      id: true,
      slug: true,
      nameUk: true,
      nameEn: true,
    },
  },
  cover: {
    select: {
      id: true,
      kind: true,
      originalName: true,
      mimeType: true,
      isReady: true,
    },
  },
  modules: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      lessons: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          type: true,
          title: true,
          sortOrder: true,
          isFreePreview: true,
          textContent: true,
          videoFileId: true,
          durationSec: true,
          createdAt: true,
          updatedAt: true,
          video: {
            select: {
              id: true,
              kind: true,
              originalName: true,
              mimeType: true,
              durationSec: true,
              isReady: true,
            },
          },
          files: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              fileId: true,
              sortOrder: true,
              file: {
                select: {
                  id: true,
                  kind: true,
                  originalName: true,
                  mimeType: true,
                  isReady: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CourseSelect;

function transliterate(value: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z',
    и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
    р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ь: '', ю: 'yu', я: 'ya', ы: 'y', э: 'e', ё: 'yo', ъ: '',
  };

  return [...value.toLowerCase()].map((char) => map[char] ?? char).join('');
}

function slugify(value: string): string {
  const slug = transliterate(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return (slug || 'course').slice(0, 180).replace(/-+$/g, '') || 'course';
}

async function makeUniqueSlug(value: string, excludeCourseId?: string): Promise<string> {
  const base = slugify(value);

  for (let suffix = 1; suffix <= 10_000; suffix += 1) {
    const suffixText = suffix === 1 ? '' : `-${suffix}`;
    const candidateBase = base.slice(0, 180 - suffixText.length).replace(/-+$/g, '');
    const candidate = `${candidateBase || 'course'}${suffixText}`;
    const existing = await prisma.course.findFirst({
      where: {
        slug: candidate,
        ...(excludeCourseId === undefined ? {} : { id: { not: excludeCourseId } }),
      },
      select: { id: true },
    });

    if (existing === null) return candidate;
  }

  throw AppError.conflict('Could not generate a unique course slug');
}

async function findOwnedCourse(db: DbClient, courseId: string, userId: string) {
  const course = await db.course.findFirst({
    where: { id: courseId, authorId: userId, deletedAt: null },
    select: { id: true, status: true },
  });

  if (course === null) throw AppError.notFound('Course not found');
  return course;
}

function assertEditable(status: CourseStatus): void {
  if (!EDITABLE_STATUSES.has(status)) {
    throw AppError.conflict('Course can be edited only in DRAFT or REJECTED status');
  }
}

async function assertActiveCategory(categoryId: string): Promise<void> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, isActive: true },
    select: { id: true },
  });
  if (category === null) throw AppError.validation('Category does not exist or is inactive');
}

async function assertOwnedReadyFile(
  db: DbClient,
  fileId: string,
  userId: string,
  kind: FileKind,
): Promise<{ durationSec: number | null }> {
  const file = await db.file.findFirst({
    where: {
      id: fileId,
      uploadedById: userId,
      kind,
      isReady: true,
      deletedAt: null,
    },
    select: { durationSec: true },
  });

  if (file === null) throw AppError.notFound('File not found');
  return file;
}

async function assertOwnedReadyFiles(
  db: DbClient,
  fileIds: string[],
  userId: string,
  kind: FileKind,
): Promise<void> {
  const uniqueIds = [...new Set(fileIds)];
  if (uniqueIds.length !== fileIds.length) {
    throw AppError.validation('fileIds must not contain duplicates');
  }
  if (uniqueIds.length === 0) return;

  const count = await db.file.count({
    where: {
      id: { in: uniqueIds },
      uploadedById: userId,
      kind,
      isReady: true,
      deletedAt: null,
    },
  });

  if (count !== uniqueIds.length) throw AppError.notFound('One or more files were not found');
}

async function recalculateCourseCounters(db: DbClient, courseId: string): Promise<void> {
  const aggregate = await db.lesson.aggregate({
    where: {
      deletedAt: null,
      module: {
        courseId,
        deletedAt: null,
      },
    },
    _count: { _all: true },
    _sum: { durationSec: true },
  });

  await db.course.update({
    where: { id: courseId },
    data: {
      lessonsCount: aggregate._count._all,
      durationSec: aggregate._sum.durationSec ?? 0,
    },
  });
}

async function nextModuleSortOrder(db: DbClient, courseId: string): Promise<number> {
  const result = await db.module.aggregate({
    where: { courseId, deletedAt: null },
    _max: { sortOrder: true },
  });
  return (result._max.sortOrder ?? -1) + 1;
}

async function nextLessonSortOrder(db: DbClient, moduleId: string): Promise<number> {
  const result = await db.lesson.aggregate({
    where: { moduleId, deletedAt: null },
    _max: { sortOrder: true },
  });
  return (result._max.sortOrder ?? -1) + 1;
}

async function findOwnedModule(db: DbClient, moduleId: string, userId: string) {
  const module = await db.module.findFirst({
    where: {
      id: moduleId,
      deletedAt: null,
      course: { authorId: userId, deletedAt: null },
    },
    select: {
      id: true,
      courseId: true,
      course: { select: { status: true } },
    },
  });

  if (module === null) throw AppError.notFound('Module not found');
  return module;
}

async function findOwnedLesson(db: DbClient, lessonId: string, userId: string) {
  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      deletedAt: null,
      module: {
        deletedAt: null,
        course: { authorId: userId, deletedAt: null },
      },
    },
    select: {
      id: true,
      type: true,
      moduleId: true,
      module: {
        select: {
          courseId: true,
          course: { select: { status: true } },
        },
      },
    },
  });

  if (lesson === null) throw AppError.notFound('Lesson not found');
  return lesson;
}

export async function createAuthorCourse(userId: string, input: CreateCourseInput) {
  await assertActiveCategory(input.categoryId);
  if (input.coverFileId !== undefined && input.coverFileId !== null) {
    await assertOwnedReadyFile(prisma, input.coverFileId, userId, FileKind.COVER);
  }

  const slug = await makeUniqueSlug(input.title);
  return prisma.course.create({
    data: {
      authorId: userId,
      categoryId: input.categoryId,
      coverFileId: input.coverFileId ?? null,
      type: input.type,
      status: CourseStatus.DRAFT,
      slug,
      title: input.title,
      shortDescription: input.shortDescription ?? '',
      description: input.description ?? '',
      outcomes: input.outcomes ?? [],
      language: input.language ?? 'uk',
      grade: input.grade ?? null,
      priceAmount: input.priceAmount ?? 0,
      currency: input.currency ?? 'UAH',
    },
    select: courseListSelect,
  });
}

export async function listAuthorCourses(userId: string, query: AuthorCourseListQuery) {
  return prisma.course.findMany({
    where: {
      authorId: userId,
      deletedAt: null,
      ...(query.status === undefined ? {} : { status: query.status }),
    },
    orderBy: { updatedAt: 'desc' },
    select: courseListSelect,
  });
}

export async function getAuthorCourse(userId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, authorId: userId, deletedAt: null },
    select: fullCourseSelect,
  });
  if (course === null) throw AppError.notFound('Course not found');
  return course;
}

export async function updateAuthorCourse(userId: string, courseId: string, input: UpdateCourseInput) {
  const owned = await findOwnedCourse(prisma, courseId, userId);
  assertEditable(owned.status);

  if (input.categoryId !== undefined) await assertActiveCategory(input.categoryId);
  if (input.coverFileId !== undefined && input.coverFileId !== null) {
    await assertOwnedReadyFile(prisma, input.coverFileId, userId, FileKind.COVER);
  }

  const slug = input.slug === undefined ? undefined : await makeUniqueSlug(input.slug, courseId);

  return prisma.course.update({
    where: { id: courseId },
    data: {
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
      ...(input.shortDescription === undefined ? {} : { shortDescription: input.shortDescription }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.outcomes === undefined ? {} : { outcomes: input.outcomes }),
      ...(input.language === undefined ? {} : { language: input.language }),
      ...(input.grade === undefined ? {} : { grade: input.grade }),
      ...(input.priceAmount === undefined ? {} : { priceAmount: input.priceAmount }),
      ...(input.currency === undefined ? {} : { currency: input.currency }),
      ...(input.coverFileId === undefined ? {} : { coverFileId: input.coverFileId }),
      ...(slug === undefined ? {} : { slug }),
    },
    select: courseListSelect,
  });
}

export async function deleteAuthorCourse(userId: string, courseId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const course = await findOwnedCourse(tx, courseId, userId);
    assertEditable(course.status);
    await tx.course.update({ where: { id: courseId }, data: { deletedAt: new Date() } });
  });
}

export async function createAuthorModule(userId: string, courseId: string, input: CreateModuleInput) {
  return prisma.$transaction(async (tx) => {
    const course = await findOwnedCourse(tx, courseId, userId);
    assertEditable(course.status);
    const sortOrder = input.sortOrder ?? (await nextModuleSortOrder(tx, courseId));

    const module = await tx.module.create({
      data: { courseId, title: input.title, sortOrder },
      select: { id: true, courseId: true, title: true, sortOrder: true, createdAt: true, updatedAt: true },
    });
    await recalculateCourseCounters(tx, courseId);
    return module;
  });
}

export async function updateAuthorModule(userId: string, moduleId: string, input: UpdateModuleInput) {
  return prisma.$transaction(async (tx) => {
    const module = await findOwnedModule(tx, moduleId, userId);
    assertEditable(module.course.status);

    return tx.module.update({
      where: { id: moduleId },
      data: input,
      select: { id: true, courseId: true, title: true, sortOrder: true, createdAt: true, updatedAt: true },
    });
  });
}

export async function deleteAuthorModule(userId: string, moduleId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const module = await findOwnedModule(tx, moduleId, userId);
    assertEditable(module.course.status);
    const deletedAt = new Date();

    await tx.lesson.updateMany({ where: { moduleId, deletedAt: null }, data: { deletedAt } });
    await tx.module.update({ where: { id: moduleId }, data: { deletedAt } });
    await recalculateCourseCounters(tx, module.courseId);
  });
}

export async function createAuthorLesson(userId: string, moduleId: string, input: CreateLessonInput) {
  return prisma.$transaction(async (tx) => {
    const module = await findOwnedModule(tx, moduleId, userId);
    assertEditable(module.course.status);

    let videoDuration: number | null = null;
    if (input.videoFileId !== undefined && input.videoFileId !== null) {
      const file = await assertOwnedReadyFile(tx, input.videoFileId, userId, FileKind.VIDEO);
      videoDuration = file.durationSec;
    }
    const fileIds = input.fileIds ?? [];
    await assertOwnedReadyFiles(tx, fileIds, userId, FileKind.ATTACHMENT);

    const sortOrder = input.sortOrder ?? (await nextLessonSortOrder(tx, moduleId));
    const lesson = await tx.lesson.create({
      data: {
        moduleId,
        type: input.type,
        title: input.title,
        sortOrder,
        isFreePreview: input.isFreePreview ?? false,
        textContent: input.textContent ?? null,
        videoFileId: input.videoFileId ?? null,
        durationSec: input.durationSec ?? videoDuration,
        files: {
          create: fileIds.map((fileId, index) => ({ fileId, sortOrder: index })),
        },
      },
      select: {
        id: true,
        moduleId: true,
        type: true,
        title: true,
        sortOrder: true,
        isFreePreview: true,
        textContent: true,
        videoFileId: true,
        durationSec: true,
        createdAt: true,
        updatedAt: true,
        files: { select: { id: true, fileId: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    await recalculateCourseCounters(tx, module.courseId);
    return lesson;
  });
}

export async function updateAuthorLesson(userId: string, lessonId: string, input: UpdateLessonInput) {
  return prisma.$transaction(async (tx) => {
    const lesson = await findOwnedLesson(tx, lessonId, userId);
    assertEditable(lesson.module.course.status);

    let inferredVideoDuration: number | null | undefined;
    if (input.videoFileId !== undefined && input.videoFileId !== null) {
      const file = await assertOwnedReadyFile(tx, input.videoFileId, userId, FileKind.VIDEO);
      inferredVideoDuration = file.durationSec;
    }
    if (input.fileIds !== undefined) {
      await assertOwnedReadyFiles(tx, input.fileIds, userId, FileKind.ATTACHMENT);
    }

    const resultingType = input.type ?? lesson.type;
    const clearsVideo = input.type !== undefined && input.type !== 'VIDEO' && input.videoFileId === undefined;
    const clearsText = input.type !== undefined && input.type !== 'TEXT' && input.textContent === undefined;

    const updated = await tx.lesson.update({
      where: { id: lessonId },
      data: {
        ...(input.type === undefined ? {} : { type: input.type }),
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
        ...(input.isFreePreview === undefined ? {} : { isFreePreview: input.isFreePreview }),
        ...(input.textContent === undefined ? (clearsText ? { textContent: null } : {}) : { textContent: input.textContent }),
        ...(input.videoFileId === undefined
          ? clearsVideo
            ? { videoFileId: null }
            : {}
          : { videoFileId: input.videoFileId }),
        ...(input.durationSec !== undefined
          ? { durationSec: input.durationSec }
          : inferredVideoDuration !== undefined
            ? { durationSec: inferredVideoDuration }
            : resultingType !== 'VIDEO' && input.type !== undefined
              ? { durationSec: null }
              : {}),
        ...(input.fileIds === undefined
          ? {}
          : {
              files: {
                deleteMany: {},
                create: input.fileIds.map((fileId, index) => ({ fileId, sortOrder: index })),
              },
            }),
      },
      select: {
        id: true,
        moduleId: true,
        type: true,
        title: true,
        sortOrder: true,
        isFreePreview: true,
        textContent: true,
        videoFileId: true,
        durationSec: true,
        createdAt: true,
        updatedAt: true,
        files: { select: { id: true, fileId: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    await recalculateCourseCounters(tx, lesson.module.courseId);
    return updated;
  });
}

export async function deleteAuthorLesson(userId: string, lessonId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const lesson = await findOwnedLesson(tx, lessonId, userId);
    assertEditable(lesson.module.course.status);
    await tx.lesson.update({ where: { id: lessonId }, data: { deletedAt: new Date() } });
    await recalculateCourseCounters(tx, lesson.module.courseId);
  });
}

export async function reorderAuthorCourse(userId: string, courseId: string, input: ReorderCourseInput) {
  await prisma.$transaction(async (tx) => {
    const course = await findOwnedCourse(tx, courseId, userId);
    assertEditable(course.status);

    const modules = await tx.module.findMany({
      where: { courseId, deletedAt: null },
      select: { id: true },
    });
    const moduleIds = new Set(modules.map((module) => module.id));

    const nestedLessons = input.modules.flatMap((module) =>
      (module.lessons ?? []).map((lesson) => ({ ...lesson, expectedModuleId: module.id })),
    );
    const flatLessons = input.lessons.map((lesson) => ({ ...lesson, expectedModuleId: undefined }));
    const lessonUpdates = [...nestedLessons, ...flatLessons];

    for (const module of input.modules) {
      if (!moduleIds.has(module.id)) throw AppError.notFound('Module not found');
    }

    if (lessonUpdates.length > 0) {
      const lessons = await tx.lesson.findMany({
        where: {
          id: { in: lessonUpdates.map((lesson) => lesson.id) },
          deletedAt: null,
          module: { courseId, deletedAt: null },
        },
        select: { id: true, moduleId: true },
      });
      const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

      for (const update of lessonUpdates) {
        const lesson = lessonById.get(update.id);
        if (lesson === undefined) throw AppError.notFound('Lesson not found');
        if (update.expectedModuleId !== undefined && lesson.moduleId !== update.expectedModuleId) {
          throw AppError.notFound('Lesson not found');
        }
      }
    }

    for (const module of input.modules) {
      await tx.module.update({ where: { id: module.id }, data: { sortOrder: module.sortOrder } });
    }
    for (const lesson of lessonUpdates) {
      await tx.lesson.update({ where: { id: lesson.id }, data: { sortOrder: lesson.sortOrder } });
    }

  });

  return getAuthorCourse(userId, courseId);
}

export async function submitAuthorCourse(userId: string, courseId: string) {
  await prisma.$transaction(async (tx) => {
    const course = await findOwnedCourse(tx, courseId, userId);
    assertEditable(course.status);
    await recalculateCourseCounters(tx, courseId);
    const now = new Date();

    await tx.course.update({
      where: { id: courseId },
      data: {
        status: CourseStatus.MODERATION,
        submittedAt: now,
        rejectionReason: null,
      },
    });
    await tx.moderationLog.create({
      data: {
        courseId,
        moderatorId: null,
        action: ModerationAction.SUBMITTED,
        fromStatus: course.status,
        toStatus: CourseStatus.MODERATION,
      },
    });
  });

  return getAuthorCourse(userId, courseId);
}

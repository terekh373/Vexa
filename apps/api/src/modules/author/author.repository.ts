import { FileKind, type ContentType, type CourseStatus, type Prisma } from '@prisma/client';
import type { prisma } from '../../lib/prisma.js';

type DbClient = Prisma.TransactionClient | typeof prisma;

// sizeBytes is a BigInt and the author API returns rows without a mapper,
// so it is deliberately left out.
export const courseFileSelect = {
  id: true,
  fileId: true,
  title: true,
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
} satisfies Prisma.CourseFileSelect;

export const courseFileOrderBy = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.CourseFileOrderByWithRelationInput[];

export async function findOwnedCourseWithType(
  db: DbClient,
  courseId: string,
  userId: string,
): Promise<{ id: string; status: CourseStatus; type: ContentType } | null> {
  return db.course.findFirst({
    where: { id: courseId, authorId: userId, deletedAt: null },
    select: { id: true, status: true, type: true },
  });
}

export async function isOwnedReadyAttachment(
  db: DbClient,
  fileId: string,
  userId: string,
): Promise<boolean> {
  const file = await db.file.findFirst({
    where: {
      id: fileId,
      uploadedById: userId,
      kind: FileKind.ATTACHMENT,
      isReady: true,
      deletedAt: null,
    },
    select: { id: true },
  });
  return file !== null;
}

export async function isFileAttached(
  db: DbClient,
  courseId: string,
  fileId: string,
): Promise<boolean> {
  const existing = await db.courseFile.findUnique({
    where: { courseId_fileId: { courseId, fileId } },
    select: { id: true },
  });
  return existing !== null;
}

export async function nextCourseFileSortOrder(db: DbClient, courseId: string): Promise<number> {
  const result = await db.courseFile.aggregate({
    where: { courseId },
    _max: { sortOrder: true },
  });
  return (result._max.sortOrder ?? -1) + 1;
}

export async function createCourseFile(
  db: DbClient,
  data: { courseId: string; fileId: string; title: string; sortOrder: number },
) {
  return db.courseFile.create({ data, select: courseFileSelect });
}

export async function countCourseFilesInCourse(
  db: DbClient,
  courseId: string,
  ids: string[],
): Promise<number> {
  return db.courseFile.count({ where: { courseId, id: { in: ids } } });
}

export async function updateCourseFileTitle(
  db: DbClient,
  courseId: string,
  courseFileId: string,
  title: string,
) {
  const { count } = await db.courseFile.updateMany({
    where: { id: courseFileId, courseId },
    data: { title },
  });
  if (count === 0) return null;
  return db.courseFile.findUnique({ where: { id: courseFileId }, select: courseFileSelect });
}

export async function deleteCourseFileById(
  db: DbClient,
  courseId: string,
  courseFileId: string,
): Promise<number> {
  const { count } = await db.courseFile.deleteMany({ where: { id: courseFileId, courseId } });
  return count;
}

export async function setCourseFileSortOrder(
  db: DbClient,
  courseFileId: string,
  sortOrder: number,
): Promise<void> {
  await db.courseFile.update({ where: { id: courseFileId }, data: { sortOrder } });
}

export async function listCourseFiles(db: DbClient, courseId: string) {
  return db.courseFile.findMany({
    where: { courseId },
    orderBy: courseFileOrderBy,
    select: courseFileSelect,
  });
}

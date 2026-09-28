import { ContentType, type Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { assertEditable } from './author.service.js';
import {
  countCourseFilesInCourse,
  createCourseFile,
  deleteCourseFileById,
  findOwnedCourseWithType,
  isFileAttached,
  isOwnedReadyAttachment,
  listCourseFiles,
  nextCourseFileSortOrder,
  setCourseFileSortOrder,
  updateCourseFileTitle,
} from './author.repository.js';
import type {
  AddCourseFileInput,
  ReorderCourseFilesInput,
  UpdateCourseFileInput,
} from './author.material.validation.js';

async function requireEditableMaterial(
  tx: Prisma.TransactionClient,
  courseId: string,
  userId: string,
): Promise<void> {
  const course = await findOwnedCourseWithType(tx, courseId, userId);
  if (course === null) throw AppError.notFound('Course not found');
  assertEditable(course.status);
  if (course.type !== ContentType.MATERIAL) {
    throw AppError.conflict('Files can be attached only to a MATERIAL');
  }
}

export async function addCourseFile(userId: string, courseId: string, input: AddCourseFileInput) {
  return prisma.$transaction(async (tx) => {
    await requireEditableMaterial(tx, courseId, userId);

    if (!(await isOwnedReadyAttachment(tx, input.fileId, userId))) {
      throw AppError.notFound('File not found');
    }
    if (await isFileAttached(tx, courseId, input.fileId)) {
      throw AppError.conflict('File is already attached');
    }

    const sortOrder = await nextCourseFileSortOrder(tx, courseId);
    return createCourseFile(tx, { courseId, fileId: input.fileId, title: input.title, sortOrder });
  });
}

export async function updateCourseFile(
  userId: string,
  courseId: string,
  courseFileId: string,
  input: UpdateCourseFileInput,
) {
  return prisma.$transaction(async (tx) => {
    await requireEditableMaterial(tx, courseId, userId);

    const updated = await updateCourseFileTitle(tx, courseId, courseFileId, input.title);
    if (updated === null) throw AppError.notFound('Course file not found');
    return updated;
  });
}

export async function deleteCourseFile(
  userId: string,
  courseId: string,
  courseFileId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await requireEditableMaterial(tx, courseId, userId);

    const count = await deleteCourseFileById(tx, courseId, courseFileId);
    if (count === 0) throw AppError.notFound('Course file not found');
  });
}

export async function reorderCourseFiles(
  userId: string,
  courseId: string,
  input: ReorderCourseFilesInput,
) {
  return prisma.$transaction(async (tx) => {
    await requireEditableMaterial(tx, courseId, userId);

    const ids = input.files.map((file) => file.id);
    if ((await countCourseFilesInCourse(tx, courseId, ids)) !== ids.length) {
      throw AppError.notFound('Course file not found');
    }

    for (const file of input.files) {
      await setCourseFileSortOrder(tx, file.id, file.sortOrder);
    }

    return listCourseFiles(tx, courseId);
  });
}

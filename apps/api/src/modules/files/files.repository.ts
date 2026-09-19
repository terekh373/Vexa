/**
 * Persistence for the files table and the join tables that attach a file to a
 * course. Prisma calls only — who may download what is decided in the service.
 */
import { CourseStatus, type File, type FileKind, StorageProvider } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface CreatePendingFileInput {
  uploadedById: string;
  kind: FileKind;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
}

/**
 * Row for an upload that has been signed but not yet confirmed. isReady=false
 * keeps it out of every listing until the client reports a successful PUT.
 */
export async function createPending(input: CreatePendingFileInput): Promise<File> {
  return prisma.file.create({
    data: {
      uploadedById: input.uploadedById,
      kind: input.kind,
      provider: StorageProvider.S3,
      storageKey: input.storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      isReady: false,
    },
  });
}

export async function findActiveById(id: string): Promise<File | null> {
  return prisma.file.findFirst({
    where: { id, deletedAt: null },
  });
}

/**
 * Marks the upload complete. sizeBytes is overwritten with what the storage
 * reports: the client-declared size was only a hint for the signature.
 */
export async function markReady(id: string, sizeBytes: bigint): Promise<File> {
  return prisma.file.update({
    where: { id },
    data: { isReady: true, sizeBytes },
  });
}

/** Every place a file can hang off a course (cover, course pack, lesson). */
function attachedToCourseWhere(fileId: string) {
  return {
    OR: [
      { coverFileId: fileId },
      { courseFiles: { some: { fileId } } },
      {
        modules: {
          some: {
            deletedAt: null,
            lessons: { some: { deletedAt: null, files: { some: { fileId } } } },
          },
        },
      },
    ],
  };
}

/**
 * True when the user authored, or holds a live enrollment on, at least one
 * course the file is attached to. One query instead of three: the OR over
 * link types is cheaper than resolving the course id first.
 */
export async function isAttachedToUserCourse(fileId: string, userId: string): Promise<boolean> {
  const count = await prisma.course.count({
    where: {
      deletedAt: null,
      ...attachedToCourseWhere(fileId),
      AND: {
        OR: [{ authorId: userId }, { enrollments: { some: { userId, revokedAt: null } } }],
      },
    },
  });

  return count > 0;
}

/**
 * True when the file is a material of a free-preview lesson in a published
 * course. Mirrors the course page, which already exposes such materials to
 * everyone — a download-url that disagreed would be a confusing 403.
 */
export async function isAttachedToFreePreview(fileId: string): Promise<boolean> {
  const count = await prisma.lesson.count({
    where: {
      deletedAt: null,
      isFreePreview: true,
      files: { some: { fileId } },
      module: {
        deletedAt: null,
        course: { deletedAt: null, status: CourseStatus.PUBLISHED },
      },
    },
  });

  return count > 0;
}

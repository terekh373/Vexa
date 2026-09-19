/**
 * File upload/download flows over signed URLs.
 *
 *   1. upload-url   — validate, create a pending row, sign a PUT
 *   2. PUT to R2    — browser only, the API never sees the bytes
 *   3. confirm      — verify the object exists in storage, flip isReady
 *   4. download-url — check the caller's right to the file, sign a GET
 *
 * All permission decisions live here. The repository only answers "does such
 * a row exist"; the controller only parses HTTP.
 */
import { randomUUID } from 'node:crypto';
import { UserRole, type File } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { headObject, presignDownload, presignUpload } from '../../lib/s3.js';
import * as filesRepository from './files.repository.js';
import { extensionForMime, type CreateUploadUrlInput, type S3FileKind } from './files.validation.js';

export interface Actor {
  userId: string;
  roles: UserRole[];
}

export interface UploadUrlResult {
  fileId: string;
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
}

export interface DownloadUrlResult {
  downloadUrl: string;
  expiresIn: number;
}

/**
 * Wire shape of a files row. sizeBytes is a BigInt in Prisma and JSON.stringify
 * throws on BigInt, so the mapper is the single place it becomes a string —
 * the same convention the course details endpoint already uses.
 */
export interface FileDto {
  id: string;
  kind: File['kind'];
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  isReady: boolean;
  createdAt: Date;
}

export function toFileDto(file: File): FileDto {
  return {
    id: file.id,
    kind: file.kind,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes.toString(),
    isReady: file.isReady,
    createdAt: file.createdAt,
  };
}

const MAX_NAME_STEM_LENGTH = 60;

/**
 * Sanitised name stem for the storage key. The client's name is untrusted:
 * it may contain path separators, spaces, Cyrillic, or be a hundred emoji.
 * Only [a-z0-9._-] survive; the extension is derived from the whitelisted
 * mime type rather than the name, so "malware.pdf.exe" cannot pick its own.
 */
export function sanitizeNameStem(originalName: string): string {
  const lastDot = originalName.lastIndexOf('.');
  const stem = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;

  const cleaned = stem
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, MAX_NAME_STEM_LENGTH);

  return cleaned.length > 0 ? cleaned : 'file';
}

/** `<kind>/<userId>/<uuid>-<sanitized-name>.<ext>`, per the issue contract. */
export function buildStorageKey(kind: string, userId: string, originalName: string, mimeType: string): string {
  const extension = extensionForMime(mimeType);
  const stem = sanitizeNameStem(originalName);

  return `${kind.toLowerCase()}/${userId}/${randomUUID()}-${stem}${extension ? `.${extension}` : ''}`;
}

/**
 * Who may upload which kind (SRS table 5). Course assets are an author's
 * business; an avatar belongs to every account, including a plain STUDENT
 * (every user holds STUDENT by default, so the list is effectively "anyone
 * signed in"). Kept here rather than in the router: it depends on the body,
 * which a route-level role gate cannot see.
 */
const UPLOAD_ROLES: Readonly<Record<S3FileKind, readonly UserRole[]>> = {
  COVER: [UserRole.AUTHOR, UserRole.ADMIN],
  ATTACHMENT: [UserRole.AUTHOR, UserRole.ADMIN],
  AVATAR: [UserRole.STUDENT, UserRole.AUTHOR, UserRole.ADMIN],
};

function assertCanUpload(actor: Actor, kind: S3FileKind): void {
  const allowed = UPLOAD_ROLES[kind];

  if (!actor.roles.some((role) => allowed.includes(role))) {
    throw AppError.forbidden(`Role not allowed to upload ${kind}`);
  }
}

export async function createUploadUrl(actor: Actor, input: CreateUploadUrlInput): Promise<UploadUrlResult> {
  assertCanUpload(actor, input.kind);

  const storageKey = buildStorageKey(input.kind, actor.userId, input.originalName, input.mimeType);

  // Row first, signature second: a signed URL nobody can confirm is harmless,
  // an orphan object in the bucket with no row is not — it is invisible.
  const file = await filesRepository.createPending({
    uploadedById: actor.userId,
    kind: input.kind,
    storageKey,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: BigInt(input.sizeBytes),
  });

  const upload = await presignUpload({
    storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });

  return {
    fileId: file.id,
    uploadUrl: upload.url,
    storageKey,
    expiresIn: upload.expiresIn,
  };
}

export async function confirmUpload(actor: Actor, fileId: string): Promise<FileDto> {
  const file = await filesRepository.findActiveById(fileId);

  if (file === null) {
    throw AppError.notFound('File not found');
  }

  // Only the uploader may confirm: an admin has no business finalising
  // someone else's half-finished upload, and nobody else should know the id.
  if (file.uploadedById !== actor.userId) {
    throw AppError.forbidden('Only the uploader can confirm this file');
  }

  // Idempotent: a retried confirm after a network blip must not fail.
  if (file.isReady) {
    return toFileDto(file);
  }

  // Trusting the client here would let anyone create "ready" rows pointing at
  // nothing. HEAD costs one round-trip and closes that hole.
  const stored = await headObject(file.storageKey);

  if (stored === null) {
    throw AppError.conflict('File has not been uploaded to storage yet');
  }

  // The signature pins Content-Type, but not every S3 implementation verifies
  // signed headers on PUT. Comparing what the storage recorded with what was
  // whitelisted at upload-url time is the last line before isReady=true.
  if (stored.mimeType !== file.mimeType) {
    throw AppError.conflict('Uploaded content type does not match the declared one');
  }

  const ready = await filesRepository.markReady(file.id, BigInt(stored.sizeBytes));

  return toFileDto(ready);
}

export async function createDownloadUrl(actor: Actor, fileId: string): Promise<DownloadUrlResult> {
  const file = await filesRepository.findActiveById(fileId);

  // A pending file is not a file yet: 404 keeps the id from leaking a "this
  // exists but you cannot have it" signal for uploads still in progress.
  if (file === null || !file.isReady) {
    throw AppError.notFound('File not found');
  }

  if (!(await canDownload(actor, file))) {
    throw AppError.forbidden('You do not have access to this file');
  }

  const download = await presignDownload({
    storageKey: file.storageKey,
    downloadName: file.originalName,
  });

  return { downloadUrl: download.url, expiresIn: download.expiresIn };
}

/**
 * Access matrix for a signed GET (SRS 20.2 + table 5):
 *   - admin: everything
 *   - uploader: own files
 *   - course author or enrolled student: files attached to that course
 *   - anyone signed in: materials of a free-preview lesson of a published course
 *
 * Cheap checks first; the two DB round-trips only run when the in-memory
 * ones fail.
 */
async function canDownload(actor: Actor, file: File): Promise<boolean> {
  if (actor.roles.includes(UserRole.ADMIN)) return true;
  if (file.uploadedById === actor.userId) return true;

  if (await filesRepository.isAttachedToUserCourse(file.id, actor.userId)) return true;

  return filesRepository.isAttachedToFreePreview(file.id);
}

/**
 * Input schemas and the upload policy (allowed types, size caps) for the
 * files module. The policy lives here rather than in the service because
 * zod needs it to reject bad input at the API boundary, before any storage
 * call is made — the issue requires the mime check to fail at upload-url
 * time, not after the bytes are already in the bucket.
 */
import { FileKind } from '@prisma/client';
import { z } from 'zod';

const MB = 1024 * 1024;

/**
 * Kinds this module handles. VIDEO is deliberately absent: video goes to
 * Cloudflare Stream through a different flow (SRS 20.2, "HLS instead of a
 * direct file") and is a separate issue.
 */
export const S3_FILE_KINDS = [FileKind.COVER, FileKind.AVATAR, FileKind.ATTACHMENT] as const;
export type S3FileKind = (typeof S3_FILE_KINDS)[number];

/** Allowed content types per kind and the extension the storage key gets. */
const MIME_EXTENSION: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
};

const IMAGE_MIMES = ['image/png', 'image/jpeg'] as const;

const DOCUMENT_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
] as const;

interface KindPolicy {
  mimeTypes: readonly string[];
  maxSizeBytes: number;
}

/**
 * Covers and avatars are images shown in the catalog: 5 MB keeps the CDN
 * cheap. Attachments (PDF, DOCX, PPTX, ZIP) are the actual product — 100 MB.
 */
export const UPLOAD_POLICY: Readonly<Record<S3FileKind, KindPolicy>> = {
  [FileKind.COVER]: { mimeTypes: IMAGE_MIMES, maxSizeBytes: 5 * MB },
  [FileKind.AVATAR]: { mimeTypes: IMAGE_MIMES, maxSizeBytes: 5 * MB },
  [FileKind.ATTACHMENT]: { mimeTypes: [...IMAGE_MIMES, ...DOCUMENT_MIMES], maxSizeBytes: 100 * MB },
};

/**
 * 200 MB is the ceiling of Stream's basic (non-tus) upload; 3600 s is the
 * duration Cloudflare reserves for an upload that never finishes, and a lesson
 * longer than an hour is not needed for the MVP.
 */
export const VIDEO_UPLOAD_POLICY = {
  mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
  maxSizeBytes: 200 * MB,
  maxDurationSec: 3600,
} as const;

export function extensionForMime(mimeType: string): string | null {
  return MIME_EXTENSION[mimeType] ?? null;
}

export const createUploadUrlSchema = z
  .object({
    kind: z.enum(S3_FILE_KINDS),
    originalName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(127),
    // Positive integer: sizeBytes = 0 is an empty file, which nobody uploads
    // on purpose. Upper bound checked per kind below.
    sizeBytes: z.number().int().positive(),
  })
  .superRefine((value, ctx) => {
    const policy = UPLOAD_POLICY[value.kind];

    if (!policy.mimeTypes.includes(value.mimeType)) {
      ctx.addIssue({
        code: 'custom',
        path: ['mimeType'],
        message: `Тип файлу не підтримується для ${value.kind}`,
      });
    }

    if (value.sizeBytes > policy.maxSizeBytes) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizeBytes'],
        message: `Файл завеликий: максимум ${policy.maxSizeBytes / MB} МБ`,
      });
    }
  });

export type CreateUploadUrlInput = z.infer<typeof createUploadUrlSchema>;

export const createVideoUploadUrlSchema = z
  .object({
    originalName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(127),
    sizeBytes: z.number().int().positive(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!VIDEO_UPLOAD_POLICY.mimeTypes.some((mimeType) => mimeType === value.mimeType)) {
      ctx.addIssue({
        code: 'custom',
        path: ['mimeType'],
        message: 'Тип файлу не підтримується для VIDEO',
      });
    }

    if (value.sizeBytes > VIDEO_UPLOAD_POLICY.maxSizeBytes) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizeBytes'],
        message: `Файл завеликий: максимум ${VIDEO_UPLOAD_POLICY.maxSizeBytes / MB} МБ`,
      });
    }
  });

export type CreateVideoUploadUrlInput = z.infer<typeof createVideoUploadUrlSchema>;

export const fileIdParamsSchema = z.object({
  id: z.string().uuid(),
});

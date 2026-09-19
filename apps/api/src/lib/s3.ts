/**
 * S3-compatible object storage client (Cloudflare R2 on every environment).
 *
 * The API never proxies file bytes: it only signs URLs. Uploads and downloads
 * go straight between the browser and the bucket, which is why express.json
 * can stay at 1mb (SRS 20.2). The bucket itself is private — every access
 * passes through a signature issued here after a server-side permission check.
 */
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  // R2 and MinIO serve buckets as a path segment, not as a subdomain. Without
  // this the SDK would sign requests for <bucket>.<endpoint>, which R2 rejects.
  forcePathStyle: true,
});

export interface PresignedUpload {
  url: string;
  /** Seconds until the signature stops working. */
  expiresIn: number;
}

export interface PresignUploadInput {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Signed PUT. Content-Length and Content-Type become part of the signature:
 * a client that received a URL for a 3 MB PNG cannot PUT a 90 MB zip with it —
 * the storage answers 403 SignatureDoesNotMatch. This is the "limits in the
 * presigned URL conditions" half of the size check; zod is the other half.
 *
 * `signableHeaders` is not optional: by default the presigner moves
 * Content-Type into the query string, where storage does not verify it.
 * Verified against MinIO — without this line a PUT with a different
 * Content-Type is accepted. The confirm step re-checks the stored type as
 * a backstop for providers that ignore signed headers.
 */
export async function presignUpload(input: PresignUploadInput): Promise<PresignedUpload> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: input.storageKey,
    ContentType: input.mimeType,
    ContentLength: input.sizeBytes,
  });

  const url = await getSignedUrl(s3, command, {
    expiresIn: env.S3_SIGNED_URL_TTL_SEC,
    signableHeaders: new Set(['content-type', 'content-length']),
  });

  return { url, expiresIn: env.S3_SIGNED_URL_TTL_SEC };
}

export interface PresignDownloadInput {
  storageKey: string;
  /** Name the browser saves the file as; never the storage key. */
  downloadName: string;
}

/**
 * Signed GET. The Content-Disposition override is signed too, so the object
 * is stored under an opaque key but downloads with its original name.
 */
export async function presignDownload(input: PresignDownloadInput): Promise<PresignedUpload> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: input.storageKey,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeRfc5987(input.downloadName)}`,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: env.S3_SIGNED_URL_TTL_SEC });

  return { url, expiresIn: env.S3_SIGNED_URL_TTL_SEC };
}

export interface StoredObjectInfo {
  sizeBytes: number;
  mimeType: string | null;
}

/**
 * Metadata of an uploaded object, or null when nothing is stored under the
 * key. Used by the confirm step so a client cannot mark a file ready without
 * actually having uploaded it.
 */
export async function headObject(storageKey: string): Promise<StoredObjectInfo | null> {
  try {
    const result = await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey }));

    return {
      sizeBytes: result.ContentLength ?? 0,
      mimeType: result.ContentType ?? null,
    };
  } catch (error) {
    // 404 is a legitimate answer here (client confirmed before uploading);
    // anything else — bad credentials, network — is a real failure.
    if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * RFC 5987 encoding for Content-Disposition: percent-encode everything the
 * header grammar does not allow, so Ukrainian file names survive the trip.
 */
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

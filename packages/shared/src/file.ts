/**
 * Files contract shared by the API and both clients.
 *
 * Upload never touches the API server: the client asks for a signed URL,
 * PUTs the bytes straight to object storage, then confirms. Both clients
 * implement the same three-step dance, so the shapes live here once.
 */

/** Kinds that go to S3-compatible storage. Video is a separate flow. */
export type UploadFileKind = 'COVER' | 'AVATAR' | 'ATTACHMENT';

/** Body of `POST /api/files/upload-url`. */
export interface CreateUploadUrlRequest {
  kind: UploadFileKind;
  originalName: string;
  mimeType: string;
  /** Exact byte length of the file the client is about to PUT. */
  sizeBytes: number;
}

export interface CreateUploadUrlResponse {
  fileId: string;
  /** PUT the raw file here with `Content-Type: <mimeType>`. */
  uploadUrl: string;
  storageKey: string;
  /** Seconds until uploadUrl stops working. */
  expiresIn: number;
}

/**
 * A files row as the API returns it. sizeBytes is a string: the column is
 * bigint and JSON has no safe integer beyond 2^53. Use Number() to display.
 */
export interface FileDto {
  id: string;
  kind: UploadFileKind | 'VIDEO';
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  isReady: boolean;
  createdAt: string;
}

export interface DownloadUrlResponse {
  /** Short-lived signed GET; open it, do not store it. */
  downloadUrl: string;
  expiresIn: number;
}

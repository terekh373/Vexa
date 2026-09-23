/**
 * Cloudflare Stream management API: direct-upload links and video status.
 *
 * Kept apart from lib/stream.ts (local playback signing, no network) so that
 * integration tests can replace this whole module without touching signing.
 */
import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from './errors.js';
import { logger } from './logger.js';

export type StreamVideoState =
  | 'pendingupload'
  | 'downloading'
  | 'queued'
  | 'inprogress'
  | 'ready'
  | 'error'
  | 'unknown';

export interface StreamVideoStatus {
  state: StreamVideoState;
  readyToStream: boolean;
  durationSec: number | null;
  errorReasonCode: string | null;
  errorReasonText: string | null;
}

export interface DirectUploadInput {
  maxDurationSeconds: number;
  creator: string;
}

const API_BASE = 'https://api.cloudflare.com/client/v4/accounts';
const REQUEST_TIMEOUT_MS = 10_000;

const KNOWN_STATES: readonly StreamVideoState[] = [
  'pendingupload',
  'downloading',
  'queued',
  'inprogress',
  'ready',
  'error',
];

export function isStreamApiConfigured(): boolean {
  return env.CF_STREAM_ACCOUNT_ID !== undefined && env.CF_STREAM_API_TOKEN !== undefined;
}

/** Pure. */
export function buildDirectUploadBody(input: DirectUploadInput): {
  maxDurationSeconds: number;
  creator: string;
  requireSignedURLs: true;
} {
  return {
    maxDurationSeconds: input.maxDurationSeconds,
    creator: input.creator,
    // Without it a video is playable by its UID alone, and the signed links
    // from lib/stream.ts would protect nothing (SRS 20.2).
    requireSignedURLs: true,
  };
}

const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value === '' ? null : value;

const videoResultSchema = z.object({
  readyToStream: z.boolean().default(false),
  status: z
    .object({
      state: z.string().optional(),
      errorReasonCode: z.string().nullish(),
      errorReasonText: z.string().nullish(),
    })
    .optional(),
  duration: z.number().optional(),
});

function toKnownState(state: string | undefined): StreamVideoState {
  return KNOWN_STATES.find((known) => known === state) ?? 'unknown';
}

/** Pure. Maps the `result` object of Cloudflare's "video details" response. */
export function mapStreamVideo(result: unknown): StreamVideoStatus {
  const parsed = videoResultSchema.parse(result);
  const duration = parsed.duration;

  return {
    state: toKnownState(parsed.status?.state),
    readyToStream: parsed.readyToStream,
    // Cloudflare reports -1 until it has probed the file.
    durationSec: duration === undefined || duration <= 0 ? null : Math.round(duration),
    errorReasonCode: emptyToNull(parsed.status?.errorReasonCode),
    errorReasonText: emptyToNull(parsed.status?.errorReasonText),
  };
}

const envelopeSchema = z.object({
  success: z.boolean(),
  errors: z.array(z.unknown()).optional(),
  result: z.unknown().optional(),
});

const directUploadResultSchema = z.object({
  uid: z.string().min(1),
  uploadURL: z.string().url(),
});

/**
 * Only the status and the `errors` from the response body are logged: request
 * headers carry the API token and must never reach the log.
 */
function failWith(reason: string, status?: number, errors?: unknown): AppError {
  logger.warn({ status, errors }, `Cloudflare Stream: ${reason}`);
  return AppError.serviceUnavailable('Video service is unavailable');
}

function credentials(): { accountId: string; token: string } {
  const { CF_STREAM_ACCOUNT_ID, CF_STREAM_API_TOKEN } = env;

  if (CF_STREAM_ACCOUNT_ID === undefined || CF_STREAM_API_TOKEN === undefined) {
    throw AppError.serviceUnavailable('Video upload is not configured');
  }

  return { accountId: CF_STREAM_ACCOUNT_ID, token: CF_STREAM_API_TOKEN };
}

async function callStream(url: string, token: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // Only the error name (network failure, timeout) is logged, never the message.
    throw failWith(err instanceof Error ? err.name : 'request failed');
  }
}

async function readEnvelope(response: Response): Promise<z.infer<typeof envelopeSchema>> {
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw failWith('response is not JSON', response.status);
  }

  const envelope = envelopeSchema.safeParse(body);

  if (!envelope.success) {
    throw failWith('unexpected response shape', response.status);
  }

  if (!response.ok || !envelope.data.success) {
    throw failWith('request rejected', response.status, envelope.data.errors);
  }

  return envelope.data;
}

export async function createStreamDirectUpload(input: DirectUploadInput): Promise<{ uid: string; uploadUrl: string }> {
  const { accountId, token } = credentials();

  const response = await callStream(`${API_BASE}/${accountId}/stream/direct_upload`, token, {
    method: 'POST',
    body: JSON.stringify(buildDirectUploadBody(input)),
  });
  const envelope = await readEnvelope(response);
  const result = directUploadResultSchema.safeParse(envelope.result);

  if (!result.success) {
    throw failWith('unexpected direct upload result', response.status);
  }

  return { uid: result.data.uid, uploadUrl: result.data.uploadURL };
}

/** null when Stream answers 404 for this uid. */
export async function getStreamVideo(uid: string): Promise<StreamVideoStatus | null> {
  const { accountId, token } = credentials();

  const response = await callStream(`${API_BASE}/${accountId}/stream/${encodeURIComponent(uid)}`, token, {
    method: 'GET',
  });

  if (response.status === 404) {
    return null;
  }

  const envelope = await readEnvelope(response);

  try {
    return mapStreamVideo(envelope.result);
  } catch {
    throw failWith('unexpected video details shape', response.status);
  }
}

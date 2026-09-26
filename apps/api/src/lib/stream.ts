/**
 * Cloudflare Stream signed playback URLs.
 *
 * No network calls to Cloudflare here: a signing key is generated once in the
 * Cloudflare dashboard (`POST /accounts/{account_id}/stream/keys`) and stored
 * in env, so a playback token is just a local RS256 JWT (SRS 20.2).
 */
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface StreamTokenInput {
  videoUid: string;
  keyId: string;
  privateKeyPem: string;
  expiresAtSec: number;
}

/** Pure. */
export function signStreamToken(input: StreamTokenInput): string {
  const payload = { sub: input.videoUid, kid: input.keyId, exp: input.expiresAtSec };

  return jwt.sign(payload, input.privateKeyPem, {
    algorithm: 'RS256',
    keyid: input.keyId,
    noTimestamp: true,
  });
}

/**
 * Pure. min(max(base, duration + base), 86_400).
 *
 * The HLS player keeps requesting new segments for as long as the viewer
 * watches, so the signed link must outlive the video itself, not just the
 * base TTL. 86 400 is Cloudflare's own ceiling on a signed token's `exp`.
 */
export function playbackTtlSec(videoDurationSec: number | null, baseTtlSec: number): number {
  const duration = videoDurationSec ?? 0;
  return Math.min(Math.max(baseTtlSec, duration + baseTtlSec), 86_400);
}

export interface StreamPlayback {
  hlsUrl: string;
  expiresIn: number;
}

/** Reads env. Returns null when signing is not configured. */
export function createStreamPlayback(videoUid: string, videoDurationSec: number | null): StreamPlayback | null {
  const { CF_STREAM_CUSTOMER_CODE, CF_STREAM_SIGNING_KEY_ID, CF_STREAM_SIGNING_KEY_PEM } = env;

  if (
    CF_STREAM_CUSTOMER_CODE === undefined ||
    CF_STREAM_SIGNING_KEY_ID === undefined ||
    CF_STREAM_SIGNING_KEY_PEM === undefined
  ) {
    return null;
  }

  const privateKeyPem = Buffer.from(CF_STREAM_SIGNING_KEY_PEM, 'base64').toString('utf8');
  const ttl = playbackTtlSec(videoDurationSec, env.STREAM_SIGNED_URL_TTL_SEC);
  const expiresAtSec = Math.floor(Date.now() / 1000) + ttl;

  const token = signStreamToken({
    videoUid,
    keyId: CF_STREAM_SIGNING_KEY_ID,
    privateKeyPem,
    expiresAtSec,
  });

  return {
    hlsUrl: `https://customer-${CF_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${token}/manifest/video.m3u8`,
    expiresIn: ttl,
  };
}

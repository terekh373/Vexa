import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { playbackTtlSec, signStreamToken } from '../../src/lib/stream.js';

describe('signStreamToken', () => {
  it('signs an RS256 token verifiable with the matching public key, without iat', () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privateKeyPem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
    const publicKeyPem = publicKey.export({ type: 'pkcs1', format: 'pem' }).toString();

    const expiresAtSec = Math.floor(Date.now() / 1000) + 600;
    const token = signStreamToken({
      videoUid: 'video-uid-123',
      keyId: 'signing-key-1',
      privateKeyPem,
      expiresAtSec,
    });

    const decoded = jwt.decode(token, { complete: true });
    expect(decoded?.header.kid).toBe('signing-key-1');

    const payload = jwt.verify(token, publicKeyPem, { algorithms: ['RS256'] });
    expect(payload).toMatchObject({ sub: 'video-uid-123', kid: 'signing-key-1', exp: expiresAtSec });
    expect(payload).not.toHaveProperty('iat');
  });
});

describe('playbackTtlSec', () => {
  it('falls back to the base TTL when the duration is unknown', () => {
    expect(playbackTtlSec(null, 600)).toBe(600);
  });

  it('adds the video duration to the base TTL', () => {
    expect(playbackTtlSec(612, 600)).toBe(1212);
  });

  it('caps the TTL at 86 400 seconds', () => {
    expect(playbackTtlSec(1_000_000, 600)).toBe(86_400);
  });
});

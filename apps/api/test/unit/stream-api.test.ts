import { describe, expect, it } from 'vitest';
import { buildDirectUploadBody, mapStreamVideo } from '../../src/lib/stream-api.js';

describe('buildDirectUploadBody', () => {
  it('always requires signed URLs and carries creator and max duration', () => {
    expect(buildDirectUploadBody({ maxDurationSeconds: 3600, creator: 'user-1' })).toEqual({
      maxDurationSeconds: 3600,
      creator: 'user-1',
      requireSignedURLs: true,
    });
  });
});

describe('mapStreamVideo', () => {
  it('maps a ready video and rounds the duration', () => {
    expect(
      mapStreamVideo({
        uid: 'abc',
        readyToStream: true,
        duration: 611.6,
        status: { state: 'ready' },
        somethingElse: { nested: true },
      }),
    ).toEqual({
      state: 'ready',
      readyToStream: true,
      durationSec: 612,
      errorReasonCode: null,
      errorReasonText: null,
    });
  });

  it('treats a negative duration as unknown', () => {
    const video = mapStreamVideo({ readyToStream: false, duration: -1, status: { state: 'inprogress' } });

    expect(video.durationSec).toBeNull();
    expect(video.readyToStream).toBe(false);
  });

  it('maps an unfamiliar state to unknown', () => {
    expect(mapStreamVideo({ status: { state: 'teleporting' } }).state).toBe('unknown');
  });

  it('keeps error reasons', () => {
    expect(
      mapStreamVideo({
        status: { state: 'error', errorReasonCode: 'ERR_NON_VIDEO', errorReasonText: 'The upload is not a video.' },
      }),
    ).toMatchObject({
      state: 'error',
      errorReasonCode: 'ERR_NON_VIDEO',
      errorReasonText: 'The upload is not a video.',
    });
  });

  it('turns empty error reasons into null', () => {
    expect(mapStreamVideo({ status: { state: 'ready', errorReasonCode: '', errorReasonText: '' } })).toMatchObject({
      errorReasonCode: null,
      errorReasonText: null,
    });
  });
});

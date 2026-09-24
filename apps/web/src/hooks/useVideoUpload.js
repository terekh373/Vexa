import { useEffect, useRef, useState } from 'react';

import { confirmVideo, uploadVideo, validateVideoForUpload } from '../services/filesService.js';

const POLL_INTERVAL_MS = 5000;
const STALL_AFTER_MS = 5 * 60 * 1000;

const UPLOAD_FAILED = 'Не вдалося завантажити відео. Спробуйте ще раз.';
const UPLOAD_UNAVAILABLE = 'Завантаження відео зараз недоступне. Спробуйте пізніше.';
const BIND_FAILED = "Відео готове, але не вдалося прив'язати його до уроку. Спробуйте ще раз.";
const PROCESSING_FAILED = 'Відео не вдалося обробити. Завантажте інший файл.';

// A video that is still processing cannot be attached to a lesson (the PATCH
// answers 404), so until it is ready the lesson → fileId link exists only on
// the client. Without this record a page reload would lose the upload.
const pendingKey = (lessonId) => `vexa.pendingVideo.${lessonId}`;

const readPendingVideo = (lessonId) => {
  try {
    return window.localStorage.getItem(pendingKey(lessonId));
  } catch {
    return null;
  }
};

const savePendingVideo = (lessonId, fileId) => {
  try {
    window.localStorage.setItem(pendingKey(lessonId), fileId);
  } catch {
    // Storage may be blocked; the upload still works, it just cannot survive a reload.
  }
};

export const clearPendingVideo = (lessonId) => {
  try {
    window.localStorage.removeItem(pendingKey(lessonId));
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
};

const uploadErrorMessage = (error) => {
  const status = error.response?.status;

  if (status === 400) {
    return error.response.data?.error?.details?.[0]?.message ?? UPLOAD_FAILED;
  }
  if (status === 503) return UPLOAD_UNAVAILABLE;
  return UPLOAD_FAILED;
};

// Upload → poll confirm → bind state machine for one lesson's video. The
// caller's onReady binds the finished file to the lesson.
export const useVideoUpload = ({ lessonId, enabled, onReady }) => {
  const [fileId, setFileId] = useState(() => (enabled ? readPendingVideo(lessonId) : null));
  const [status, setStatus] = useState(() => (fileId ? 'processing' : 'idle'));
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  // Kept in a ref so a new callback identity on re-render does not restart polling.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const fail = (message, retryable) => {
    setStatus('error');
    setError(message);
    setCanRetry(retryable);
  };

  const start = async (file) => {
    const validationError = validateVideoForUpload(file);
    if (validationError) {
      setPendingFile(null);
      fail(validationError, false);
      return;
    }

    setPendingFile(file);
    setStatus('uploading');
    setProgress(0);
    setError('');
    setCanRetry(false);

    try {
      const uploadedFileId = await uploadVideo(file, setProgress);
      savePendingVideo(lessonId, uploadedFileId);
      setFileId(uploadedFileId);
      setPendingFile(null);
      setProgress(0);
      setStatus('processing');
    } catch (uploadError) {
      fail(uploadErrorMessage(uploadError), true);
    }
  };

  const retry = () => {
    if (fileId) {
      setError('');
      setCanRetry(false);
      setStatus('processing');
    } else if (pendingFile) {
      start(pendingFile);
    }
  };

  useEffect(() => {
    if (status !== 'processing' || !fileId || !enabled) return undefined;

    let cancelled = false;
    let timer = null;
    const startedAt = Date.now();

    const poll = async () => {
      let result;

      try {
        result = await confirmVideo(fileId);
      } catch (confirmError) {
        if (cancelled) return;
        const httpStatus = confirmError.response?.status;

        if (httpStatus >= 400 && httpStatus < 500) {
          clearPendingVideo(lessonId);
          setFileId(null);
          fail(PROCESSING_FAILED, false);
        } else {
          setStatus('stalled');
        }
        return;
      }

      if (cancelled) return;

      if (!result.ready) {
        if (Date.now() - startedAt >= STALL_AFTER_MS) {
          setStatus('stalled');
          return;
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      try {
        await onReadyRef.current(result.file);
      } catch {
        // confirm is idempotent, so keeping fileId and the stored record makes retry safe.
        if (!cancelled) fail(BIND_FAILED, true);
        return;
      }

      // The video is bound now, so the record must go even if the lesson was left meanwhile.
      clearPendingVideo(lessonId);
      if (cancelled) return;
      setFileId(null);
      setStatus('idle');
    };

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [status, fileId, enabled, lessonId]);

  useEffect(() => {
    if (status !== 'uploading') return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  return { status, progress, error, canRetry, start, retry };
};

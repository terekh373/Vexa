import { useCallback, useState } from 'react';

import { uploadFile, validateFileForUpload } from '../services/filesService.js';

// Shared upload state machine for cover, avatar and attachment pickers: pick
// a file, validate it client-side, run the three-step upload, and expose a
// retry that resends the same file if step 2 (the PUT) failed.
export const useFileUpload = (kind) => {
  const [pendingFile, setPendingFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const start = useCallback(
    (file) => {
      const validationError = validateFileForUpload(file, kind);
      if (validationError) {
        setPendingFile(file);
        setStatus('error');
        setError(validationError);
        return Promise.resolve(null);
      }

      setPendingFile(file);
      setStatus('uploading');
      setProgress(0);
      setError('');

      return uploadFile(file, kind, setProgress)
        .then((uploaded) => {
          setStatus('idle');
          setPendingFile(null);
          setProgress(0);
          return uploaded;
        })
        .catch(() => {
          setStatus('error');
          setError('Не вдалося завантажити файл. Спробуйте ще раз.');
          return null;
        });
    },
    [kind],
  );

  const retry = useCallback(() => {
    if (!pendingFile) return Promise.resolve(null);
    return start(pendingFile);
  }, [pendingFile, start]);

  const reset = useCallback(() => {
    setPendingFile(null);
    setStatus('idle');
    setProgress(0);
    setError('');
  }, []);

  return { status, progress, error, pendingFile, start, retry, reset };
};

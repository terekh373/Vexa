import { useEffect, useRef, useState } from 'react';

import { useFileUpload } from '../../../../hooks/useFileUpload.js';
import styles from '../CourseWizard.module.css';

// Cover preview: a freshly picked file is shown from a local object URL
// right away (no need to round-trip through the signed download URL while
// it is still in the browser); a cover loaded from the server is shown via
// initialPreviewUrl, fetched once by the parent.
const CoverField = ({ coverName, initialPreviewUrl, disabled, disabledHint, onUploaded }) => {
  const inputRef = useRef(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null);
  const upload = useFileUpload('COVER');

  useEffect(
    () => () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    },
    [localPreviewUrl],
  );

  const handleSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return objectUrl;
    });

    const uploaded = await upload.start(file);
    if (uploaded) onUploaded(uploaded);
  };

  const previewUrl = localPreviewUrl ?? initialPreviewUrl;
  const isUploading = upload.status === 'uploading';

  return (
    <div className={styles.field}>
      <span className={styles.label}>Обкладинка курсу</span>

      <div className={styles.coverRow}>
        {previewUrl ? (
          <img src={previewUrl} alt={coverName || 'Обкладинка курсу'} className={styles.coverPreview} />
        ) : (
          <div className={styles.coverPlaceholder}>Немає обкладинки</div>
        )}

        <div className={styles.coverControls}>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className={styles.hiddenFileInput}
            onChange={handleSelect}
            disabled={disabled || isUploading}
          />
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? `Завантаження... ${upload.progress}%` : previewUrl ? 'Замінити' : 'Завантажити'}
          </button>

          {isUploading && (
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${upload.progress}%` }} />
            </div>
          )}

          {upload.status === 'error' && (
            <div className={styles.uploadError}>
              <span className={styles.error}>{upload.error}</span>
              <button type="button" className={styles.retryButton} onClick={upload.retry}>
                Повторити
              </button>
            </div>
          )}

          {disabled && disabledHint && <span className={styles.counter}>{disabledHint}</span>}
        </div>
      </div>
    </div>
  );
};

export default CoverField;

import { useRef } from 'react';

import { useVideoUpload } from '../../../../hooks/useVideoUpload.js';
import { VIDEO_ACCEPT } from '../../../../services/filesService.js';
import styles from '../CourseWizard.module.css';

const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const LessonVideoField = ({ lesson, readOnly, onBind }) => {
  const inputRef = useRef(null);
  const upload = useVideoUpload({ lessonId: lesson.id, enabled: !readOnly, onReady: onBind });

  const currentVideo = lesson.video?.isReady ? lesson.video : null;
  const currentLabel = currentVideo
    ? `Поточне відео: ${currentVideo.originalName}${
        currentVideo.durationSec ? ` · ${formatDuration(currentVideo.durationSec)}` : ''
      }`
    : '';

  if (readOnly) {
    return (
      <div className={styles.field}>
        <span className={styles.label}>Відео уроку</span>
        <span>{currentLabel || 'Відео не завантажене.'}</span>
      </div>
    );
  }

  const handleSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) upload.start(file);
  };

  const showPicker = upload.status === 'idle' || upload.status === 'error';

  return (
    <div className={styles.field}>
      <span className={styles.label}>Відео уроку</span>

      {currentLabel && <span>{currentLabel}</span>}

      {showPicker && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={VIDEO_ACCEPT}
            className={styles.hiddenFileInput}
            onChange={handleSelect}
          />
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => inputRef.current?.click()}
          >
            {currentVideo ? 'Замінити відео' : 'Завантажити відео'}
          </button>
          <span className={styles.counter}>MP4, MOV або WebM, до 200 МБ.</span>
        </>
      )}

      {upload.status === 'uploading' && (
        <>
          <span>Завантаження... {upload.progress}%</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${upload.progress}%` }} />
          </div>
        </>
      )}

      {upload.status === 'processing' && (
        <p role="status" className={styles.counter}>
          Відео обробляється. Це може тривати кілька хвилин — сторінку можна перезавантажити.
        </p>
      )}

      {upload.status === 'stalled' && (
        <div className={styles.uploadError}>
          <span>Відео ще обробляється.</span>
          <button type="button" className={styles.retryButton} onClick={upload.retry}>
            Перевірити ще раз
          </button>
        </div>
      )}

      {upload.status === 'error' && (
        <div className={styles.uploadError}>
          <span className={styles.error}>{upload.error}</span>
          {upload.canRetry && (
            <button type="button" className={styles.retryButton} onClick={upload.retry}>
              Повторити
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonVideoField;

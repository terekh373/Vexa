import { useEffect, useRef, useState } from 'react';

import { useFileUpload } from '../../../../hooks/useFileUpload.js';
import { ATTACHMENT_ACCEPT } from '../../../../services/filesService.js';
import styles from '../CourseWizard.module.css';

const MaterialFileRow = ({ entry, isFirst, isLast, readOnly, onRename, onRemove, onMove }) => {
  const [title, setTitle] = useState(entry.title);
  const [rowError, setRowError] = useState('');

  useEffect(() => {
    setTitle(entry.title);
  }, [entry.title]);

  if (readOnly) {
    return (
      <li className={styles.attachmentRow}>
        <div className={styles.materialFileInfo}>
          <span className={styles.lessonTitle}>{entry.title}</span>
          <span className={styles.counter}>{entry.file.originalName}</span>
        </div>
      </li>
    );
  }

  const commit = async () => {
    setRowError('');
    const trimmed = title.trim();
    if (trimmed === entry.title) {
      setTitle(entry.title);
      return;
    }

    if (!trimmed) {
      setRowError('Вкажіть назву файлу.');
      setTitle(entry.title);
      return;
    }

    const saved = await onRename(entry.id, trimmed);
    if (!saved) setTitle(entry.title);
  };

  // Saving happens on blur only, so Enter just leaves the field; committing in
  // both places would send the same rename twice.
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };

  return (
    <li className={styles.attachmentRow}>
      <div className={styles.materialFileInfo}>
        <input
          className={`${styles.input} ${rowError ? styles.inputError : ''}`}
          value={title}
          maxLength={180}
          aria-label="Назва файлу"
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
        {rowError && <span className={styles.error}>{rowError}</span>}
        <span className={styles.counter}>{entry.file.originalName}</span>
      </div>

      <div className={styles.rowActions}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => onMove(-1)}
          disabled={isFirst}
          aria-label="Вгору"
        >
          ↑
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => onMove(1)}
          disabled={isLast}
          aria-label="Вниз"
        >
          ↓
        </button>
        <button
          type="button"
          className={styles.removeButton}
          onClick={() => onRemove(entry.id)}
          aria-label="Видалити файл"
        >
          ×
        </button>
      </div>
    </li>
  );
};

const StepMaterialFiles = ({ files, readOnly, error, onAttach, onRename, onRemove, onMove }) => {
  const inputRef = useRef(null);
  const upload = useFileUpload('ATTACHMENT');
  const isUploading = upload.status === 'uploading';

  const handleSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const uploaded = await upload.start(file);
    if (uploaded) onAttach(uploaded);
  };

  const handleRetry = async () => {
    const uploaded = await upload.retry();
    if (uploaded) onAttach(uploaded);
  };

  return (
    <div className={styles.form}>
      {error && <p className={styles.formError}>{error}</p>}

      {files.length === 0 ? (
        <p className={styles.emptyLessonList}>
          Файлів ще немає. Матеріал можна подати на модерацію, коли в ньому є хоча б один файл.
        </p>
      ) : (
        <ol className={styles.attachmentList}>
          {files.map((entry, index) => (
            <MaterialFileRow
              key={entry.id}
              entry={entry}
              isFirst={index === 0}
              isLast={index === files.length - 1}
              readOnly={readOnly}
              onRename={onRename}
              onRemove={onRemove}
              onMove={(direction) => onMove(index, direction)}
            />
          ))}
        </ol>
      )}

      {!readOnly && (
        <div className={styles.field}>
          <input
            ref={inputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            className={styles.hiddenFileInput}
            onChange={handleSelect}
            disabled={isUploading}
          />
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? `Завантаження... ${upload.progress}%` : '+ Додати файл'}
          </button>

          {isUploading && (
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${upload.progress}%` }} />
            </div>
          )}

          {upload.status === 'error' && (
            <div className={styles.uploadError}>
              <span className={styles.error}>{upload.error}</span>
              <button type="button" className={styles.retryButton} onClick={handleRetry}>
                Повторити
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StepMaterialFiles;

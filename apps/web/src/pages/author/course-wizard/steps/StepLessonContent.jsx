import { useEffect, useMemo, useRef, useState } from 'react';

import { useFileUpload } from '../../../../hooks/useFileUpload.js';
import { clearPendingVideo } from '../../../../hooks/useVideoUpload.js';
import { ATTACHMENT_ACCEPT } from '../../../../services/filesService.js';
import { apiFieldErrors } from '../courseFormState.js';
import styles from '../CourseWizard.module.css';

import LessonVideoField from './LessonVideoField.jsx';

const snapshotOf = (lesson) => ({
  type: lesson.type,
  title: lesson.title,
  isFreePreview: lesson.isFreePreview,
  textContent: lesson.textContent ?? '',
  fileIds: (lesson.files ?? []).map((entry) => entry.fileId),
});

const buildPatch = (current, saved) => {
  const patch = {};

  if (current.type !== saved.type) patch.type = current.type;
  if (current.title !== saved.title) patch.title = current.title;
  if (current.isFreePreview !== saved.isFreePreview) patch.isFreePreview = current.isFreePreview;

  if (current.type === 'TEXT' && current.textContent !== saved.textContent) {
    patch.textContent = current.textContent;
  }

  if (current.type === 'FILE' && JSON.stringify(current.fileIds) !== JSON.stringify(saved.fileIds)) {
    patch.fileIds = current.fileIds;
  }

  return patch;
};

const AttachmentUploader = ({ attachments, onAdd, onRemove, disabled }) => {
  const inputRef = useRef(null);
  const upload = useFileUpload('ATTACHMENT');
  const isUploading = upload.status === 'uploading';

  const handleSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const uploaded = await upload.start(file);
    if (uploaded) onAdd(uploaded);
  };

  return (
    <div className={styles.field}>
      <span className={styles.label}>Файли уроку</span>

      <ul className={styles.attachmentList}>
        {attachments.map((file) => (
          <li key={file.id} className={styles.attachmentRow}>
            <span className={styles.lessonTitle}>{file.originalName}</span>
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => onRemove(file.id)}
              disabled={disabled}
              aria-label="Прибрати файл"
            >
              ×
            </button>
          </li>
        ))}
        {attachments.length === 0 && <li className={styles.emptyLessonList}>Файлів ще немає</li>}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
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
        {isUploading ? `Завантаження... ${upload.progress}%` : '+ Додати файл'}
      </button>

      {upload.status === 'error' && (
        <div className={styles.uploadError}>
          <span className={styles.error}>{upload.error}</span>
          <button type="button" className={styles.retryButton} onClick={upload.retry}>
            Повторити
          </button>
        </div>
      )}
    </div>
  );
};

const StepLessonContent = ({ modules, readOnly, onUpdateLesson }) => {
  const lessons = useMemo(
    () =>
      modules.flatMap((module) =>
        module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })),
      ),
    [modules],
  );

  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [draft, setDraft] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (lessons.length === 0) {
      setSelectedLessonId('');
      return;
    }
    if (!lessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(lessons[0].id);
    }
  }, [lessons, selectedLessonId]);

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  useEffect(() => {
    if (!selectedLesson) {
      setDraft(null);
      setAttachments([]);
      setSavedSnapshot(null);
      return;
    }

    const snapshot = snapshotOf(selectedLesson);
    setDraft(snapshot);
    setSavedSnapshot(snapshot);
    setAttachments((selectedLesson.files ?? []).map((entry) => entry.file));
    setSaveError('');
    setSaveMessage('');
    setFieldErrors({});
    // `lessons` (and so `selectedLesson`) is memoized off `modules`, so this
    // only re-runs when the course's server-confirmed structure changes —
    // not on every keystroke in the draft below.
  }, [selectedLesson]);

  if (lessons.length === 0) {
    return <p className={styles.placeholder}>Спершу додайте урок на кроці «Модулі»</p>;
  }

  if (!draft) return null;

  const handleField = (name, value) => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const handleAddAttachment = (fileDto) => {
    setAttachments((current) => [...current, fileDto]);
    setDraft((current) => ({ ...current, fileIds: [...current.fileIds, fileDto.id] }));
  };

  const handleRemoveAttachment = (fileId) => {
    setAttachments((current) => current.filter((file) => file.id !== fileId));
    setDraft((current) => ({ ...current, fileIds: current.fileIds.filter((id) => id !== fileId) }));
  };

  // The type travels with the binding because the draft may not have saved it yet.
  const handleBindVideo = (file) =>
    onUpdateLesson(selectedLesson.id, { type: 'VIDEO', videoFileId: file.id });

  const handleSave = async () => {
    const patch = buildPatch(draft, savedSnapshot);
    setSaveError('');
    setSaveMessage('');
    setFieldErrors({});

    if (Object.keys(patch).length === 0) {
      setSaveMessage('Немає змін для збереження.');
      return;
    }

    try {
      setSaving(true);
      await onUpdateLesson(selectedLesson.id, patch);
      // Switching away from VIDEO abandons any video still being processed.
      if (patch.type && patch.type !== 'VIDEO') clearPendingVideo(selectedLesson.id);
      setSavedSnapshot(draft);
      setSaveMessage('Збережено.');
    } catch (error) {
      const fromApi = apiFieldErrors(error);
      if (Object.keys(fromApi).length > 0) {
        setFieldErrors(fromApi);
      } else {
        setSaveError('Не вдалося зберегти урок. Спробуйте ще раз.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Урок</span>
        <select
          className={styles.select}
          value={selectedLessonId}
          onChange={(event) => setSelectedLessonId(event.target.value)}
        >
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.moduleTitle} — {lesson.title}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Назва уроку</span>
        <input
          className={`${styles.input} ${fieldErrors.title ? styles.inputError : ''}`}
          value={draft.title}
          onChange={(event) => handleField('title', event.target.value)}
          disabled={readOnly}
        />
        {fieldErrors.title && <span className={styles.error}>{fieldErrors.title}</span>}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Тип уроку</span>
        <select
          className={styles.select}
          value={draft.type}
          onChange={(event) => handleField('type', event.target.value)}
          disabled={readOnly}
        >
          <option value="TEXT">Текст</option>
          <option value="FILE">Файл</option>
          <option value="VIDEO">Відео</option>
          <option value="QUIZ" disabled>
            Тест (з'явиться пізніше)
          </option>
        </select>
      </label>

      <label className={styles.checkboxField}>
        <input
          type="checkbox"
          checked={draft.isFreePreview}
          onChange={(event) => handleField('isFreePreview', event.target.checked)}
          disabled={readOnly}
        />
        <span>Безкоштовний перегляд</span>
      </label>

      {draft.type === 'TEXT' && (
        <label className={styles.field}>
          <span className={styles.label}>Зміст уроку</span>
          <textarea
            className={`${styles.textarea} ${fieldErrors.textContent ? styles.inputError : ''}`}
            value={draft.textContent}
            onChange={(event) => handleField('textContent', event.target.value)}
            disabled={readOnly}
          />
          {fieldErrors.textContent && <span className={styles.error}>{fieldErrors.textContent}</span>}
        </label>
      )}

      {draft.type === 'FILE' && (
        <AttachmentUploader
          attachments={attachments}
          onAdd={handleAddAttachment}
          onRemove={handleRemoveAttachment}
          disabled={readOnly}
        />
      )}

      {draft.type === 'VIDEO' && (
        <LessonVideoField
          key={selectedLesson.id}
          lesson={selectedLesson}
          readOnly={readOnly}
          onBind={handleBindVideo}
        />
      )}

      {saveMessage && <p className={styles.success}>{saveMessage}</p>}
      {saveError && <p className={styles.formError}>{saveError}</p>}

      {!readOnly && (
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Зберігаємо...' : 'Зберегти урок'}
        </button>
      )}
    </div>
  );
};

export default StepLessonContent;

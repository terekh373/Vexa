import { useState } from 'react';

import styles from './LessonContent.module.css';

import { getFileDownloadUrl } from '../../../services/learningService.js';

import Quiz from '../quiz/Quiz.jsx';

import VideoPlayer from './VideoPlayer.jsx';

const formatDuration = (seconds) => {
  if (!seconds) return '';

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} хв`;
};

const formatFileSize = (sizeBytes) => {
  if (!sizeBytes) return '';

  const bytes = Number(sizeBytes);

  if (Number.isNaN(bytes)) return '';

  if (bytes < 1024) {
    return `${bytes} Б`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} КБ`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const LessonContent = ({
  lesson,
  isCompleted,
  isCourseCompleted,
  loading,
  error,
  completing,
  quizSubmitting,
  quizResult,
  quizError,
  previousLesson,
  nextLesson,
  onPrevious,
  onNext,
  onComplete,
  onQuizSubmit,
  onQuizReset,
  onFinishCourse,
  onRefreshVideo,
}) => {
  const [downloadingFileId, setDownloadingFileId] =
    useState(null);

  const [downloadError, setDownloadError] =
    useState('');

  const handleDownload = async (fileId) => {
    if (!fileId) return;

    try {
      setDownloadingFileId(fileId);
      setDownloadError('');

      const { downloadUrl } =
        await getFileDownloadUrl(fileId);

      window.open(
        downloadUrl,
        '_blank',
        'noopener,noreferrer',
      );
    } catch (downloadErrorResponse) {
      console.error(
        'Не вдалося завантажити файл:',
        downloadErrorResponse,
      );

      const status =
        downloadErrorResponse.response?.status;

      if (status === 403) {
        setDownloadError(
          'Немає доступу до цього файлу.',
        );
      } else if (status === 404) {
        setDownloadError(
          'Файл не знайдено.',
        );
      } else {
        setDownloadError(
          'Не вдалося завантажити файл. Спробуйте ще раз.',
        );
      }
    } finally {
      setDownloadingFileId(null);
    }
  };

  if (loading) {
    return (
      <main className={styles.lessonContent}>
        <div className={styles.state}>
          Завантаження уроку...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.lessonContent}>
        <div className={styles.state}>
          <h2>Не вдалося завантажити урок</h2>

          <p>Спробуйте відкрити його ще раз.</p>
        </div>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className={styles.lessonContent}>
        <div className={styles.state}>
          Оберіть урок із програми курсу.
        </div>
      </main>
    );
  }

  return (
    <main className={styles.lessonContent}>
      <div className={styles.lessonTop}>
        <div>
          <span className={styles.lessonLabel}>
            Поточний урок
          </span>

          <h2>{lesson.title}</h2>

          {lesson.durationSec > 0 && (
            <p>
              {formatDuration(lesson.durationSec)}
            </p>
          )}
        </div>

        {isCompleted && (
          <span className={styles.completedBadge}>
            ✓ Завершено
          </span>
        )}
      </div>

      {lesson.type === 'TEXT' && (
        <div className={styles.textLesson}>
          {lesson.text ||
            'Текст уроку поки не додано.'}
        </div>
      )}

      {lesson.type === 'VIDEO' && (
        <VideoPlayer
          video={lesson.video}
          onRefreshSource={onRefreshVideo}
        />
      )}

      {lesson.type === 'QUIZ' && lesson.quiz && (
        <Quiz
          quiz={lesson.quiz}
          submitting={quizSubmitting}
          result={quizResult}
          error={quizError}
          onSubmit={onQuizSubmit}
          onResetResult={onQuizReset}
        />
      )}

      {lesson.materials?.length > 0 && (
        <div className={styles.materials}>
          <h3>Матеріали уроку</h3>

          <div className={styles.materialsList}>
            {lesson.materials.map((material) => {
              const fileId =
                material.fileId ?? material.id;

              const isDownloading =
                downloadingFileId === fileId;

              return (
                <div
                  key={material.id}
                  className={styles.material}
                >
                  <div className={styles.materialInfo}>
                    <strong>
                      {material.title ||
                        material.name ||
                        'Матеріал уроку'}
                    </strong>

                    <div
                      className={
                        styles.materialMeta
                      }
                    >
                      {material.format && (
                        <span>
                          {material.format.toUpperCase()}
                        </span>
                      )}

                      {material.sizeBytes && (
                        <span>
                          {formatFileSize(
                            material.sizeBytes,
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.downloadButton
                    }
                    disabled={isDownloading}
                    onClick={() =>
                      handleDownload(fileId)
                    }
                  >
                    {isDownloading
                      ? 'Завантаження...'
                      : 'Завантажити'}
                  </button>
                </div>
              );
            })}
          </div>

          {downloadError && (
            <p className={styles.downloadError}>
              {downloadError}
            </p>
          )}
        </div>
      )}

      {lesson.type !== 'QUIZ' &&
        !isCompleted && (
          <div className={styles.complete}>
            <button
              type="button"
              disabled={completing}
              onClick={onComplete}
            >
              {completing
                ? 'Завершення...'
                : nextLesson
                  ? 'Завершити та перейти далі'
                  : 'Завершити урок'}
            </button>
          </div>
        )}

      <div className={styles.navigation}>
        <button
          type="button"
          disabled={
            !previousLesson ||
            previousLesson.isLocked
          }
          onClick={onPrevious}
        >
          ← Попередній урок
        </button>

        {nextLesson ? (
          <button
            type="button"
            disabled={nextLesson.isLocked}
            onClick={onNext}
          >
            Наступний урок →
          </button>
        ) : isCourseCompleted ? (
          <button
            type="button"
            className={styles.finishButton}
            onClick={onFinishCourse}
          >
            Завершити навчання
          </button>
        ) : null}
      </div>
    </main>
  );
};

export default LessonContent;
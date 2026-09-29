import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { routes } from '@vexa/shared';

import styles from './LessonPreview.module.css';

import { useAuth } from '../../../context/auth-context.js';
import { getLearningLesson } from '../../../services/learningService.js';
import VideoPlayer from '../../../pages/learning/player/VideoPlayer.jsx';

const formatFileSize = (sizeBytes) => {
  const bytes = Number(sizeBytes);

  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const VideoPreview = ({ lessonId }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [video, setVideo] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (isLoading || !user) return undefined;

    let isCancelled = false;

    getLearningLesson(lessonId)
      .then((lesson) => {
        if (isCancelled) return;
        setVideo(lesson.video);
        setStatus('ready');
      })
      .catch(() => {
        if (!isCancelled) setStatus('error');
      });

    return () => {
      isCancelled = true;
    };
  }, [lessonId, user, isLoading]);

  // The stream URL is short-lived, so the player asks for a fresh one on expiry.
  const refreshSource = useCallback(
    async () => (await getLearningLesson(lessonId)).video,
    [lessonId],
  );

  if (isLoading) return <p className={styles.state}>Завантаження відео...</p>;

  if (!user) {
    return (
      <p className={styles.state}>
        Щоб переглянути відео, увійдіть в акаунт.{' '}
        <Link to={routes.login()} state={{ from: location }}>
          Увійти
        </Link>
      </p>
    );
  }

  if (status === 'loading') {
    return <p className={styles.state}>Завантаження відео...</p>;
  }

  if (status === 'error') {
    return <p className={styles.state}>Не вдалося завантажити відео.</p>;
  }

  return <VideoPlayer video={video} onRefreshSource={refreshSource} />;
};

const LessonBody = ({ lesson }) => {
  const content = lesson.content ?? {};

  if (lesson.type === 'VIDEO') return <VideoPreview lessonId={lesson.id} />;

  if (lesson.type === 'FILE') {
    return (
      <>
        <ul className={styles.files}>
          {(content.materials ?? []).map((material) => (
            <li key={material.id}>
              {material.name}
              <span className={styles.meta}>
                {[material.format?.toUpperCase(), formatFileSize(material.sizeBytes)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.state}>Завантаження файлів доступне після покупки.</p>
      </>
    );
  }

  if (lesson.type === 'QUIZ') {
    const count = content.quiz?.questions?.length ?? 0;

    return (
      <p className={styles.state}>
        Тест: {count} запитань. Проходження доступне після покупки.
      </p>
    );
  }

  return (
    <div className={styles.text}>
      {content.text || 'Текст уроку поки не додано.'}
    </div>
  );
};

const LessonPreview = ({ lesson, onClose }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const { overflow } = document.body.style;

    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-preview-title"
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 id="lesson-preview-title" className={styles.title}>
            {lesson.title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose}>
            Закрити
          </button>
        </div>

        <LessonBody lesson={lesson} />
      </div>
    </div>
  );
};

export default LessonPreview;

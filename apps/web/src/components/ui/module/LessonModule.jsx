import { useState } from 'react';
import styles from './LessonModule.module.css';

const formatDuration = (seconds) => {
  if (!seconds) return '0 хв';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours} год ${minutes} хв`;
  if (hours > 0) return `${hours} год`;
  return `${minutes} хв`;
};

const getLessonsText = (count) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return 'урок';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'уроки';
  return 'уроків';
};

const LessonModule = ({ module }) => {
  const [isOpen, setIsOpen] = useState(false);
  const lessons = module.lessons ?? [];
  const durationSec = lessons.reduce(
    (total, lesson) => total + (Number(lesson.durationSec) || 0),
    0,
  );

  return (
    <div className={styles.module}>
      <button
        className={styles.moduleHeader}
        onClick={() => setIsOpen((value) => !value)}
        type="button"
        aria-expanded={isOpen}
      >
        <span className={styles.moduleTitle}>{module.title}</span>

        <div className={styles.moduleRight}>
          <span>{lessons.length} {getLessonsText(lessons.length)}</span>
          <span>·</span>
          <span>{formatDuration(durationSec)}</span>
          <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}>
            ⌄
          </span>
        </div>
      </button>

      {isOpen && (
        <div className={styles.moduleLessons}>
          {lessons.map((lesson) => {
            const isPreview = lesson.isFreePreview ?? lesson.isPreview ?? false;

            return (
              <div className={styles.lesson} key={lesson.id}>
                <div className={styles.lessonTitleRow}>
                  <span>{lesson.title}</span>
                  {isPreview && (
                    <span className={styles.previewBadge}>Безкоштовний перегляд</span>
                  )}
                  {!isPreview && lesson.isLocked && (
                    <span className={styles.lockedBadge}>Закрито</span>
                  )}
                </div>
                <span>{formatDuration(lesson.durationSec)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LessonModule;

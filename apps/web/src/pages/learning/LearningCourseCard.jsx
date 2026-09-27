import { Link } from 'react-router-dom';

import { routes } from '@vexa/shared';

import fallbackImage from '../../assets/images/img01.png';

import styles from './LearningCourseCard.module.css';

const LearningCourseCard = ({ enrollment }) => {
  const course = enrollment.course;
  const progress = enrollment.progress;

  const image = course.cover?.url || fallbackImage;

  const continueLesson = progress?.continueLesson;

  const playerPath = continueLesson
    ? routes.playerLesson(course.id, continueLesson.id)
    : routes.player(course.id);

  const isCompleted = progress?.state === 'COMPLETED';

  const buttonTitle = isCompleted
    ? 'Переглянути курс'
    : progress?.state === 'NOT_STARTED'
      ? 'Почати'
      : 'Продовжити';

  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        <img
          src={image}
          alt={course.title}
          className={styles.image}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.top}>
          {course.category?.name && (
            <span className={styles.category}>
              {course.category.name}
            </span>
          )}
        </div>

        <h2>{course.title}</h2>

        <p className={styles.author}>
          <span>Викладач:</span>
          {course.author?.name || 'Не вказано'}
        </p>

        <div className={styles.progressInfo}>
          <span>{progress?.percent ?? 0}%</span>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{
                width: `${progress?.percent ?? 0}%`,
              }}
            />
          </div>
        </div>

        <p className={styles.lessons}>
          {progress?.completedLessons ?? 0} із{' '}
          {progress?.totalLessons ?? 0} уроків
        </p>

        {continueLesson && !isCompleted && (
          <p className={styles.nextLesson}>
            Наступний урок: {continueLesson.title}
          </p>
        )}

        {isCompleted && (
          <div className={styles.completed}>
            Курс завершено
          </div>
        )}

        <Link
          to={playerPath}
          className={styles.continueButton}
        >
          {buttonTitle}
        </Link>
      </div>
    </article>
  );
};

export default LearningCourseCard;
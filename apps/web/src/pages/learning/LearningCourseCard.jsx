import { Link } from 'react-router-dom';

import { routes } from '@vexa/shared';

import fallbackImage from '../../assets/images/img01.png';

import styles from './LearningCourseCard.module.css';

const formatPrice = (amount) => {
  if (!amount) return 'Безкоштовно';

  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
};

const LearningCourseCard = ({ course }) => {
  const image = course.image || fallbackImage;

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
          <span className={styles.category}>
            {course.category}
          </span>

          <span className={styles.price}>
            {formatPrice(course.price)}
          </span>
        </div>

        <h2>{course.title}</h2>

        <p className={styles.author}>
          <span>Викладач:</span>
          {course.author}
        </p>

        <div className={styles.progressInfo}>
          <span>{course.progress}%</span>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>

        <p className={styles.lessons}>
          {course.completedLessons} із {course.totalLessons} уроків
        </p>

        {course.nextLesson && (
          <p className={styles.nextLesson}>
            Наступний урок: {course.nextLesson}
          </p>
        )}

        {course.status === 'COMPLETED' ? (
          <div className={styles.completed}>
            Курс завершено
          </div>
        ) : (
          <Link
            to={routes.player(course.id)}
            className={styles.continueButton}
          >
            Продовжити
          </Link>
        )}
      </div>
    </article>
  );
};

export default LearningCourseCard;
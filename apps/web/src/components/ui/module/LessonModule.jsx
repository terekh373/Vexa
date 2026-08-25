import styles from './LessonModule.module.css'
import { useState } from 'react';

const LessonModule = ({ lesson }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getLessonsText = (count) => {
    if (count === 0) return 'уроків';
    if (count === 1) return 'урок';
    if (count <= 5) return 'уроки';
    return 'уроків';
  }

  const getHoursText = (count) => {
    if (count === 1) return 'год';
    if (count <= 5) return 'год';
    return 'год';
  };

  return (
    <div className={styles.module}>
      <button
        className={styles.moduleHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.moduleTitle}>{lesson.title}</span>

        <div className={styles.moduleRight}>
          <span>
            {lesson.lessons.length} {getLessonsText(lesson.lessons.length)}
          </span>
          <span>·</span>

          <span>
            {lesson.hours} {getHoursText(lesson.hours)}
          </span>

          <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}>
           ⌄
          </span>
        </div>
      </button>

      {isOpen && (
        <div className={styles.moduleLessons}>
          {lesson.lessons.map((lessonItem, index) => (
            <div className={styles.lesson} key={index}>
              <span>{lessonItem.title}</span>
              <span>{lessonItem.duration}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonModule;


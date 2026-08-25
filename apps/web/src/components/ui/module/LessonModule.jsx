import styles from './LessonModule.module.css'
import { useState } from 'react';

const LessonModule = ({ title, info, lessons }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.module}>
      <button
        className={styles.moduleHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>

        <div className={styles.moduleRight}>
          <span>{info}</span>

          <span className={`arrow ${isOpen ? 'arrow--open' : ''}`}>
           ⌄
          </span>
        </div>
      </button>

      {isOpen && (
        <div className={styles.moduleLessons}>
          {lessons.map((lesson, index) => (
            <div className={styles.lesson} key={index}>
              <span>{lesson.title}</span>
              <span>{lesson.duration}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonModule;
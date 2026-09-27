import styles from './CourseProgram.module.css';

const formatDuration = (seconds) => {
  if (!seconds) return '';

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} хв`;
};

const CourseProgram = ({
  modules = [],
  currentLessonId,
  onLessonClick,
}) => {
  return (
    <aside className={styles.program}>
      <div className={styles.programHeader}>
        <h2>Програма курсу</h2>
      </div>

      <div className={styles.modules}>
        {modules.map((module) => (
          <div
            key={module.id}
            className={styles.module}
          >
            <h3>{module.title}</h3>

            <div className={styles.lessons}>
              {module.lessons.map((lesson, lessonIndex) => {
                const isActive = lesson.id === currentLessonId;

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    className={`${styles.lesson} ${
                      isActive ? styles.activeLesson : ''
                    }`}
                    disabled={lesson.isLocked}
                    onClick={() => onLessonClick(lesson)}
                  >
                    <span
                      className={`${styles.lessonNumber} ${
                        lesson.isCompleted
                          ? styles.completedLesson
                          : ''
                      }`}
                    >
                      {lesson.isCompleted ? '✓' : lessonIndex + 1}
                    </span>

                    <span className={styles.lessonInfo}>
                      <strong>{lesson.title}</strong>

                      <small>
                        {lesson.isLocked
                          ? 'Недоступно'
                          : formatDuration(lesson.durationSec)}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default CourseProgram;
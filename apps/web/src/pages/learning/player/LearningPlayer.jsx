import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx';

import { learningCourse } from '../../../data/learningCourse.js';
import styles from './LearningPlayer.module.css';

const LearningPlayer = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const lessons = useMemo(() => {
    return learningCourse.modules.flatMap((module) => module.lessons);
  }, []);

  const currentLesson =
    lessons.find((lesson) => lesson.id === lessonId) || lessons[0];

  const currentLessonIndex = lessons.findIndex(
    (lesson) => lesson.id === currentLesson.id
  );

  const previousLesson = lessons[currentLessonIndex - 1];
  const nextLesson = lessons[currentLessonIndex + 1];

  const handleLessonClick = (lessonIdToOpen) => {
    navigate(
      routes.playerLesson(
        courseId || learningCourse.id,
        lessonIdToOpen
      )
    );
  };

  const handlePreviousLesson = () => {
    if (!previousLesson) return;

    navigate(
      routes.playerLesson(
        courseId || learningCourse.id,
        previousLesson.id
      )
    );
  };

  const handleNextLesson = () => {
    if (!nextLesson) return;

    navigate(
      routes.playerLesson(
        courseId || learningCourse.id,
        nextLesson.id
      )
    );
  };

  return (
    <section className={styles.player}>
      <Container>
        <Breadcrumbs
          title="Мої курси"
          link={routes.learning()}
          pages={learningCourse.title}
        />

        <div className={styles.top}>
          <div>
            <Link
              to={routes.learning()}
              className={styles.back}
            >
              ← Назад до моїх курсів
            </Link>

            <h1>{learningCourse.title}</h1>

            <p>
              {learningCourse.completedLessons} з{' '}
              {learningCourse.totalLessons} уроків завершено
            </p>
          </div>

          <div className={styles.progressInfo}>
            <div className={styles.progressHeader}>
              <span>Прогрес курсу</span>
              <strong>{learningCourse.progress}%</strong>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={styles.progressValue}
                style={{
                  width: `${learningCourse.progress}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <aside className={styles.program}>
            <div className={styles.programHeader}>
              <h2>Програма курсу</h2>

              <span>
                {learningCourse.completedLessons}/
                {learningCourse.totalLessons}
              </span>
            </div>

            <div className={styles.modules}>
              {learningCourse.modules.map((module, moduleIndex) => (
                <div
                  key={module.id}
                  className={styles.module}
                >
                  <h3>
                    Модуль {moduleIndex + 1}. {module.title}
                  </h3>

                  <div className={styles.lessons}>
                    {module.lessons.map((lesson, lessonIndex) => {
                      const isActive =
                        lesson.id === currentLesson.id;

                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          className={`${styles.lesson} ${
                            isActive ? styles.activeLesson : ''
                          }`}
                          onClick={() =>
                            handleLessonClick(lesson.id)
                          }
                        >
                          <span
                            className={`${styles.lessonNumber} ${
                              lesson.completed
                                ? styles.completedLesson
                                : ''
                            }`}
                          >
                            {lesson.completed
                              ? '✓'
                              : lessonIndex + 1}
                          </span>

                          <span className={styles.lessonInfo}>
                            <strong>{lesson.title}</strong>
                            <small>{lesson.duration}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className={styles.lessonContent}>
            <div className={styles.lessonTop}>
              <div>
                <span className={styles.lessonLabel}>
                  Поточний урок
                </span>

                <h2>{currentLesson.title}</h2>

                <p>{currentLesson.duration}</p>
              </div>

              {currentLesson.completed && (
                <span className={styles.completedBadge}>
                  ✓ Завершено
                </span>
              )}
            </div>

            <div className={styles.video}>
              <div className={styles.playButton}>
                ▶
              </div>
            </div>

            <div className={styles.description}>
              <h3>Про урок</h3>

              <p>{currentLesson.description}</p>
            </div>

            <div className={styles.assignment}>
              <h3>Завдання</h3>

              <p>
                Перегляньте матеріал уроку та виконайте практичне
                завдання для закріплення теми.
              </p>

              <button type="button">
                Перейти до завдання
              </button>
            </div>

            <div className={styles.navigation}>
              <button
                type="button"
                disabled={!previousLesson}
                onClick={handlePreviousLesson}
              >
                ← Попередній урок
              </button>

              <button
                type="button"
                disabled={!nextLesson}
                onClick={handleNextLesson}
              >
                Наступний урок →
              </button>
            </div>
          </main>
        </div>
      </Container>
    </section>
  );
};

export default LearningPlayer;
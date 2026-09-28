import { useEffect, useMemo, useState } from 'react';

import { Link, useNavigate, useParams } from 'react-router-dom';

import { routes } from '@vexa/shared';

import { Container } from '../../../components/layout/container/Container.jsx';

import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx';

import {
  completeLesson,
  getLearningCourse,
  getLearningLesson,
  submitQuizAttempt,
} from '../../../services/learningService.js';

import CourseProgram from './CourseProgram.jsx';

import LessonContent from './LessonContent.jsx';

import styles from './LearningPlayer.module.css';

const LearningPlayer = () => {
  const { courseId, lessonId } = useParams();

  const navigate = useNavigate();

  const [courseData, setCourseData] = useState(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [lesson, setLesson] = useState(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState(false);

  const [completingLesson, setCompletingLesson] =
    useState(false);

  const [quizSubmitting, setQuizSubmitting] =
    useState(false);

  const [quizResult, setQuizResult] =
    useState(null);

  const [quizError, setQuizError] =
    useState('');

  useEffect(() => {
    let cancelled = false;

    const loadCourse = async () => {
      try {
        setCourseLoading(true);
        setCourseError(false);
        setAccessDenied(false);

        const data = await getLearningCourse(courseId);

        if (cancelled) return;

        setCourseData(data);

        if (data.access === 'PREVIEW') {
          setAccessDenied(true);
          return;
        }

        if (!lessonId) {
          const targetLesson =
            data.progress?.continueLesson?.id ||
            data.modules
              ?.flatMap((module) => module.lessons)
              .find((item) => !item.isLocked)?.id;

          if (targetLesson) {
            navigate(
              routes.playerLesson(
                courseId,
                targetLesson,
              ),
              { replace: true },
            );
          }
        }
      } catch (error) {
        console.error(
          'Не вдалося завантажити програму курсу:',
          error,
        );

        if (!cancelled) {
          if (error.response?.status === 403) {
            setAccessDenied(true);
          } else {
            setCourseError(true);
          }
        }
      } finally {
        if (!cancelled) {
          setCourseLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId, navigate]);

  useEffect(() => {
    if (!lessonId) {
      setLesson(null);

      return undefined;
    }

    let cancelled = false;

    const loadLesson = async () => {
      try {
        setLessonLoading(true);
        setLessonError(false);
        setLesson(null);
        setQuizResult(null);
        setQuizError('');

        const data = await getLearningLesson(
          lessonId,
        );

        if (!cancelled) {
          setLesson(data);
        }
      } catch (error) {
        console.error(
          'Не вдалося завантажити урок:',
          error,
        );

        if (!cancelled) {
          if (error.response?.status === 403) {
            setAccessDenied(true);
          } else {
            setLessonError(true);
          }
        }
      } finally {
        if (!cancelled) {
          setLessonLoading(false);
        }
      }
    };

    loadLesson();

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const lessons = useMemo(() => {
    return (
      courseData?.modules?.flatMap(
        (module) => module.lessons,
      ) ?? []
    );
  }, [courseData]);

  const currentProgramLesson = lessons.find(
    (item) => item.id === lessonId,
  );

  const currentLessonIndex = lessons.findIndex(
    (item) => item.id === lessonId,
  );

  const previousLesson =
    currentLessonIndex > 0
      ? lessons[currentLessonIndex - 1]
      : null;

  const nextLesson =
    currentLessonIndex >= 0
      ? lessons[currentLessonIndex + 1] ?? null
      : null;

  const handleQuizSubmit = async (answers) => {
    if (!lesson?.quiz?.id) return;

    try {
      setQuizSubmitting(true);
      setQuizError('');

      const data = await submitQuizAttempt(
        lesson.quiz.id,
        answers,
      );

      setQuizResult(data);

      setCourseData((current) => {
        if (!current) return current;

        return {
          ...current,
          progress:
            data.progress ?? current.progress,
          modules: current.modules.map(
            (module) => ({
              ...module,
              lessons: module.lessons.map(
                (item) =>
                  item.id === lessonId &&
                  data.attempt?.isPassed
                    ? {
                        ...item,
                        isCompleted: true,
                      }
                    : item,
              ),
            }),
          ),
        };
      });
    } catch (error) {
      console.error(
        'Не вдалося відправити тест:',
        error,
      );

      const status = error.response?.status;
      const message =
        error.response?.data?.error?.message ??
        error.response?.data?.message;

      if (
        status === 409 &&
        message === 'No attempts left'
      ) {
        setQuizError(
          'Усі доступні спроби використано.',
        );
      } else if (
        status === 409 &&
        message === 'Quiz has no questions'
      ) {
        setQuizError(
          'У цьому тесті немає запитань.',
        );
      } else if (status === 403) {
        setQuizError(
          'Немає доступу до проходження цього тесту.',
        );
      } else if (status === 404) {
        setQuizError(
          'Тест не знайдено.',
        );
      } else if (status === 400) {
        setQuizError(
          'Не вдалося перевірити відповіді. Перевірте дані та спробуйте ще раз.',
        );
      } else {
        setQuizError(
          'Не вдалося відправити тест. Спробуйте ще раз.',
        );
      }
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleQuizReset = () => {
    setQuizResult(null);
    setQuizError('');
  };

  const handleRefreshVideo = async () => {
    if (!lessonId) {
      return null;
    }

    const refreshedLesson =
      await getLearningLesson(lessonId);

    setLesson(refreshedLesson);

    return refreshedLesson.video;
  };

  const handleLessonClick = (
    lessonToOpen,
  ) => {
    if (lessonToOpen.isLocked) return;

    navigate(
      routes.playerLesson(
        courseId,
        lessonToOpen.id,
      ),
    );
  };

  const handlePreviousLesson = () => {
    if (
      !previousLesson ||
      previousLesson.isLocked
    ) {
      return;
    }

    navigate(
      routes.playerLesson(
        courseId,
        previousLesson.id,
      ),
    );
  };

  const handleNextLesson = () => {
    if (!nextLesson || nextLesson.isLocked) {
      return;
    }

    navigate(
      routes.playerLesson(
        courseId,
        nextLesson.id,
      ),
    );
  };

  const handleCompleteLesson = async () => {
    if (
      !lessonId ||
      currentProgramLesson?.isCompleted
    ) {
      return;
    }

    try {
      setCompletingLesson(true);

      const data = await completeLesson(
        lessonId,
      );

      setCourseData((current) => {
        if (!current) return current;

        return {
          ...current,
          progress:
            data.progress ?? current.progress,
          modules: current.modules.map(
            (module) => ({
              ...module,
              lessons: module.lessons.map(
                (item) =>
                  item.id === lessonId
                    ? {
                        ...item,
                        isCompleted: true,
                      }
                    : item,
              ),
            }),
          ),
        };
      });

      if (
        nextLesson &&
        !nextLesson.isLocked
      ) {
        navigate(
          routes.playerLesson(
            courseId,
            nextLesson.id,
          ),
        );
      }
    } catch (error) {
      console.error(
        'Не вдалося завершити урок:',
        error,
      );
    } finally {
      setCompletingLesson(false);
    }
  };

  const handleFinishCourse = () => {
    navigate(routes.learning());
  };

  if (courseLoading) {
    return (
      <section className={styles.player}>
        <Container>
          <div className={styles.state}>
            Завантаження курсу...
          </div>
        </Container>
      </section>
    );
  }

  if (accessDenied && courseData) {
    return (
      <section className={styles.player}>
        <Container>
          <Breadcrumbs
            title="Мої курси"
            link={routes.learning()}
            pages={courseData.course.title}
          />

          <div className={styles.state}>
            <h2>Курс не придбано</h2>

            <p>
              Щоб отримати доступ до всіх уроків курсу,
              спочатку придбайте його.
            </p>

            <Link
              to={routes.course(
                courseData.course.slug,
              )}
              className={styles.courseLink}
            >
              Перейти до курсу
            </Link>
          </div>
        </Container>
      </section>
    );
  }

  if (courseError || !courseData) {
    return (
      <section className={styles.player}>
        <Container>
          <div className={styles.state}>
            <h2>
              Не вдалося завантажити курс
            </h2>

            <p>
              Спробуйте оновити сторінку.
            </p>
          </div>
        </Container>
      </section>
    );
  }

  const progress = courseData.progress;

  return (
    <section className={styles.player}>
      <Container>
        <Breadcrumbs
          title="Мої курси"
          link={routes.learning()}
          pages={courseData.course.title}
        />

        <div className={styles.top}>
          <div className={styles.courseInfo}>
            <Link
              to={routes.learning()}
              className={styles.back}
            >
              ← Назад до моїх курсів
            </Link>

            <h1>
              {courseData.course.title}
            </h1>

            {progress && (
              <p>
                {progress.completedLessons} з{' '}
                {progress.totalLessons} уроків
                завершено
              </p>
            )}
          </div>

          {progress && (
            <div className={styles.progressInfo}>
              <div
                className={
                  styles.progressHeader
                }
              >
                <span>
                  Прогрес курсу
                </span>

                <strong>
                  {progress.percent}%
                </strong>
              </div>

              <div
                className={
                  styles.progressTrack
                }
              >
                <div
                  className={
                    styles.progressValue
                  }
                  style={{
                    width: `${progress.percent}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.content}>
          <CourseProgram
            modules={courseData.modules}
            currentLessonId={lessonId}
            onLessonClick={
              handleLessonClick
            }
          />

          <LessonContent
            lesson={lesson}
            isCompleted={
              currentProgramLesson?.isCompleted ?? false
            }
            isCourseCompleted={
              progress?.state === 'COMPLETED'
            }
            loading={lessonLoading}
            error={lessonError}
            completing={completingLesson}
            quizSubmitting={quizSubmitting}
            quizResult={quizResult}
            quizError={quizError}
            previousLesson={previousLesson}
            nextLesson={nextLesson}
            onPrevious={handlePreviousLesson}
            onNext={handleNextLesson}
            onComplete={handleCompleteLesson}
            onQuizSubmit={handleQuizSubmit}
            onQuizReset={handleQuizReset}
            onFinishCourse={handleFinishCourse}
            onRefreshVideo={handleRefreshVideo}
          />
        </div>
      </Container>
    </section>
  );
};

export default LearningPlayer;
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { useAuth } from '../../context/auth-context.js';
import { learningCourses } from '../../data/learningCourses.js';
import Calendar from '../../components/ui/calendar/Calendar.jsx';

import styles from './StudentDashboard.module.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const courses = learningCourses;

  const firstName = user?.fullName?.split(' ')[0] || 'Користувач';

  const mainCourse =
    courses.find((course) => course.status === 'IN_PROGRESS') ??
    courses[0] ??
    null;

  const dashboardCourses = courses.slice(0, 3);

  const handleContinue = () => {
    if (!mainCourse) {
      return;
    }

    navigate(routes.player(mainCourse.id));
  };

  return (
    <section className={styles.dashboard}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.userInfo}>
              <div className={styles.greeting}>
                <h1>Привіт, {firstName}!</h1>
                <p>Готові продовжити навчання?</p>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.grid}>
          <div className={styles.leftCol}>
            {mainCourse ? (
              <article className={styles.heroCard}>
                <div className={styles.heroTop}>
                  <span className={styles.heroTitle}>{mainCourse.title}</span>
                  <span className={styles.heroBadge}>Поточний курс</span>
                </div>

                <div className={styles.heroBottom}>
                  <div className={styles.heroInfo}>
                    <div className={styles.courseMeta}>
                      <span className={styles.lightText}>Ви навчаєтесь</span>
                      <strong>{mainCourse.title}</strong>

                      {mainCourse.category && (
                        <span className={styles.lightText}>
                          {mainCourse.category}
                        </span>
                      )}
                    </div>

                    <div className={styles.progressBox}>
                      <div className={styles.progressLabels}>
                        <span>Твій прогрес</span>
                        <span className={styles.percentText}>
                          {mainCourse.progress ?? 0}%
                        </span>
                      </div>

                      <div className={styles.track}>
                        <div
                          className={styles.bar}
                          style={{ width: `${mainCourse.progress ?? 0}%` }}
                        />
                      </div>

                      {mainCourse.module && (
                        <span className={styles.lightText}>
                          {mainCourse.module}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className={styles.btnContinue}
                      onClick={handleContinue}
                    >
                      Продовжити навчання →
                    </button>
                  </div>

                  {mainCourse.image && (
                    <div className={styles.heroImgBox}>
                      <img
                        src={mainCourse.image}
                        alt={mainCourse.title}
                      />
                    </div>
                  )}
                </div>
              </article>
            ) : (
              <div className={styles.emptyHeroCard}>
                <h3>У вас поки немає активних курсів</h3>
                <p>Перейдіть до каталогу та оберіть курс для навчання.</p>

                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => navigate(routes.catalog())}
                >
                  Перейти в каталог
                </button>
              </div>
            )}

            <section className={styles.card}>
              <div className={styles.cardTop}>
                <h2>Мої курси</h2>

                <button
                  type="button"
                  className={styles.link}
                  onClick={() => navigate(routes.learning())}
                >
                  Перейти до всіх курсів →
                </button>
              </div>

              {dashboardCourses.length > 0 ? (
                <div className={styles.coursesList}>
                  {dashboardCourses.map((course) => (
                    <button
                      type="button"
                      key={course.id}
                      className={styles.courseItem}
                      onClick={() => navigate(routes.player(course.id))}
                    >
                      <div className={styles.imgWrapper}>
                        {course.image ? (
                          <img
                            src={course.image}
                            alt={course.title}
                          />
                        ) : (
                          <div className={styles.courseImageFallback} />
                        )}
                      </div>

                      <div className={styles.courseText}>
                        <h3>{course.title}</h3>
                        <p>{course.module || course.category || 'Навчальний курс'}</p>

                        <div className={styles.courseProgress}>
                          <span>Прогрес</span>
                          <strong>{course.progress ?? 0}%</strong>
                        </div>

                        <div className={styles.miniTrack}>
                          <div
                            className={styles.miniBar}
                            style={{ width: `${course.progress ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyCourses}>
                  <p>У вас поки немає курсів.</p>
                  <button
                    type="button"
                    className={styles.link}
                    onClick={() => navigate(routes.catalog())}
                  >
                    Перейти до каталогу →
                  </button>
                </div>
              )}
            </section>
          </div>

          <div className={styles.rightCol}>
            <Calendar />

            <div className={styles.bottomSplit}>
              <section className={styles.card}>
                <div className={styles.cardTop}>
                  <h2>Маршрут на сьогодні</h2>
                </div>

                <div className={styles.taskList}>
                  <div className={styles.taskItem}>
                    <div className={styles.checkDone}>✓</div>

                    <div>
                      <strong>Ранкове повторення</strong>
                      <p>Виконано • 5 хв</p>
                    </div>
                  </div>

                  {mainCourse && (
                    <div className={styles.taskItem}>
                      <div className={styles.timeTag}>10:00</div>

                      <div className={styles.joinFlex}>
                        <div>
                          <strong>{mainCourse.title}</strong>
                          <p>Навчальний курс</p>
                        </div>

                        <button
                          type="button"
                          className={styles.joinBtn}
                          onClick={handleContinue}
                        >
                          Перейти
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardTop}>
                  <h2>Завдання на тиждень</h2>
                  <span className={styles.metaCount}>2 з 5</span>
                </div>

                <div className={styles.taskList}>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      defaultChecked
                    />

                    <div>
                      <strong>Повторити матеріал</strong>
                      <p>Сьогодні, 18:00</p>
                    </div>
                  </label>

                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      defaultChecked
                    />

                    <div>
                      <strong>Пройти тест</strong>
                      <p>Завтра, 12:00</p>
                    </div>
                  </label>

                  <label className={styles.checkRow}>
                    <input type="checkbox" />

                    <div>
                      <strong>Завершити урок</strong>
                      <p>До кінця тижня</p>
                    </div>
                  </label>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StudentDashboard;
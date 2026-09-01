import styles from './Course.module.css';

import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { Container } from '../../components/layout/container/Container';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs';

import Clock from '../../assets/icons/Clock.svg';
import Book from '../../assets/icons/Book-2.svg';
import Star from '../../assets/icons/star.svg';
import Group from '../../assets/icons/for-authors-icons/groups.svg';

import certificate from '../../assets/images/certificate.png';
import InfoBg from '../../assets/images/for-course-images/course-info-bg.png';
import authorAvatar from '../../assets/images/for-course-images/author-avatar.png';

import checkingIcon from '../../assets/icons/checking.svg';
import checkBallIcon from '../../assets/icons/check-ball.svg';

import Button from '../../components/ui/buttons/Button';
import { Title } from '../../components/ui/title/Title';
import { CardsList } from '../../components/ui/cards-list/CardsList.jsx';

import { CourseAuthorCard } from './CourseAuthorcard.jsx';
import { OpenMore } from '../../components/ui/openmore/OpenMore.jsx';
import LessonModule from '../../components/ui/module/LessonModule.jsx';

import CoursePageSkeleton from '../../components/ui/skeleton/course-page/CoursePageSkeleton.jsx';

import { getCourse, getCourseReviews, } from '../../services/coursesService.js';
import NotFound from '../not-found/NotFound.jsx';

const formatDuration = (seconds) => {
  if (!seconds) return '0 годин';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours} год ${minutes} хв`;
  }

  if (hours > 0) {
    return `${hours} год`;
  }

  return `${minutes} хв`;
};


const formatPrice = (amount) => {
  return `${(amount / 100).toFixed(2)} ₴`;
};


const Course = () => {
  const { idOrSlug } = useParams();

  const [course, setCourse] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getCourse(idOrSlug);

        if (!data) {
          setError('not-found');
          return;
        }

        setCourse(data);
      } catch (error) {
        console.error(error);
        setError('server-error');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [idOrSlug]);


  useEffect(() => {
    if (!course?.id) return;

    const loadReviews = async () => {
      try {
        setReviewsLoading(true);

        const data = await getCourseReviews(
          course.id,
          reviewsPage,
          10
        );

        setReviews(data.items ?? data.reviews ?? []);
        setReviewsTotalPages(
          data.totalPages ?? 1
        );
      } catch (error) {
        console.error(error);
      } finally {
        setReviewsLoading(false);
      }
    };

    loadReviews();
  }, [course?.id, reviewsPage]);

  const toggleReviews = () => {
    setIsReviewsOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <Container>
        <main className={styles.container}>
          <CoursePageSkeleton />
        </main>
      </Container>
    );
  }

  if (error === 'not-found') {
    return <NotFound />;
  }

  if (error === 'server-error') {
    return (
      <Container>
        <main className={styles.container}>
          <h2>Не вдалося завантажити курс</h2>
          <p>Спробуйте оновити сторінку.</p>
        </main>
      </Container>
    );
  }

  if (!course) {
    return null;
  }

  const price = course.price?.amount ?? 0;
  const author = course.author;
  const rating = course.rating;

  const handlePurchase = () => {
  if (course.hasAccess) {
    // TODO: Перейти до навчання
    return;
  }

  // TODO: Додати курс до кошика в Sprint 4
};

  return (
    <Container>
      <main className={styles.container}>

        <Breadcrumbs
          title="Головна"
          link="/"
          pages={`Нові курси / ${course.title}`}
        />

        {/* HERO */}
        <div className={styles.courseRow}>
          <div
            className={styles.courseMainInfo}
            style={{
              backgroundImage: `url(${course.cover || InfoBg})`,
            }}
          >

            <h2 className={styles.title}>{course.title}</h2>
            <p>{course.shortDescription}</p>

            <ul className={styles.listCoursePage}>
              <li className={styles.itemCoursePage}>
                <img
                  src={Star}
                  alt="Рейтинг"
                />

                <span>
                  {rating?.average ?? 0}{' '}
                  ({rating?.count ?? 0} відгуків)
                </span>
              </li>


              <li className={styles.itemCoursePage}>
                <img
                  src={Group}
                  alt="Студенти"
                />

                <span>
                  {course.studentsCount ?? 0} студентів
                </span>
              </li>


              <li className={styles.itemCoursePage}>
                <img
                  src={Clock}
                  alt="Тривалість"
                />

                <span>
                  {formatDuration(course.durationSec)}
                </span>
              </li>


              <li className={styles.itemCoursePage}>
                <img
                  src={Book}
                  alt="Уроки"
                />

                <span>
                  {course.lessonsCount ?? 0} уроків
                </span>
              </li>
            </ul>

            <div className={styles.author}>
              <img
                src={author?.avatar || authorAvatar}
                alt={author?.name || 'Автор курсу'}
              />

              <div>
                <span>{author?.name || 'Автор курсу'}</span>
                <span>{author?.headline || ''}</span>
              </div>
            </div>
          </div>

          {/* PRICE */}
          <div className={styles.coursePriceInfo}>
            <div className={styles.coursePrice}>
              <span>{formatPrice(price)}</span>
            </div>


            <div className={styles.courseRowBttn}>
              <Button
                title={
                  course.hasAccess
                    ? 'Перейти до навчання'
                    : 'Придбати курс'
                }
                variant="primary"
                size="medium"
                onClick={handlePurchase}
              />

              <Button
                title="Додати в обране"
                variant="secondary"
                size="medium"
              />
            </div>
            <ul className={styles.priorityList}>
              <li>
                <div className={styles.checkBox}>
                  <img
                    src={checkingIcon}
                    alt="check icon"
                  />
                </div>
                <span>Доступ назавжди</span>
              </li>

              <li>
                <div className={styles.checkBox}>
                  <img
                    src={checkingIcon}
                    alt="check icon"
                  />
                </div>
                <span>Доступ на мобільних пристроях</span>
              </li>

              <li>
                <div className={styles.checkBox}>
                  <img
                    src={checkingIcon}
                    alt="check icon"
                  />
                </div>
                <span>Сертифікат після завершення</span>
              </li>

              <li>
                <div className={styles.checkBox}>
                  <img
                    src={checkingIcon}
                    alt="check icon"
                  />
                </div>
                <span>Повернення протягом 14 днів</span>
              </li>
            </ul>

            <p>Без ризику. 14 днів на повернення коштів.</p>
          </div>
        </div>

        {/* ABOUT COURSE */}
        <section id="about" className={styles.aboutCourseBox}>
          <div className={styles.courseDetails}>
            <nav className={styles.courseTabs} aria-label="Навігація по курсу">
              <a href="#about" className={styles.linkItem}>Про курс</a>
              <a href="#program" className={styles.linkItem}>Програма</a>
              <a href="#author" className={styles.linkItem}>Автор</a>
              <a href="#reviews" className={styles.linkItem}>Відгуки</a>
              <a href="#faq" className={styles.linkItem}>Питання та відповіді</a>
            </nav>
            
            <div className={styles.about}>
              <h3>Про курс</h3>
              <h4>{course.shortDescription}</h4>
              <p>{course.description}</p>
            </div>
          </div>

          <ul className={styles.courseInfo}>
            <li>
              <img
                src={checkBallIcon}
                alt="check icon"
              />

              <p>
                <span>Рівень: </span>

                <span>
                  {course.grade
                    ? `${course.grade} клас`
                    : 'Для всіх'}
                </span>
              </p>
            </li>

            <li>
              <img
                src={checkBallIcon}
                alt="check icon"
              />

              <p>
                <span>Формат: </span>

                <span>
                  {course.type === 'COURSE'
                    ? 'Відеокурс'
                    : 'Навчальний матеріал'}
                </span>
              </p>
            </li>

            <li>
              <img
                src={checkBallIcon}
                alt="check icon"
              />

              <p>
                <span>Мова: </span>
                <span>
                  {course.language === 'uk'
                    ? 'Українська'
                    : course.language}
                </span>
              </p>
            </li>

            <li>
              <img
                src={checkBallIcon}
                alt="check icon"
              />

              <p>
                <span>Доступ: </span>
                <span>Назавжди</span>
              </p>
            </li>

            <li>
              <img
                src={checkBallIcon}
                alt="check icon"
              />

              <p>
                <span>Категорія: </span>
                <span>
                  {course.category?.nameUk}
                </span>
              </p>
            </li>
          </ul>
        </section>


        {course.type === 'COURSE' ? (
          <section id="program" className={styles.lessonsBox}>
            <div className={styles.modulesBox}>
              {course.modules?.length > 0 ? (
                course.modules.map((module) => (
                  <LessonModule
                    key={module.id}
                    lesson={module}
                  />
                ))
              ) : (
                <p>Програма курсу поки недоступна.</p>
              )}
            </div>

            <div className={styles.certificateBox}>
              <img
                src={certificate}
                alt="Сертифікат"
              />
              <p>Отримайте сертифікат після завершення курсу</p>
            </div>
          </section>
        ) : course.type === 'MATERIAL' ? (
          <section id="program" className={styles.materialsBox}>
            <h3>Матеріали курсу</h3>

            {course.materials?.length > 0 ? (
              course.materials.map((material) => (
                <div key={material.id}>
                  <h4>{material.title}</h4>
                  <span>
                    {material.name} · {material.format.toUpperCase()}
                  </span>
                </div>
              ))
            ) : (
              <p>Матеріалів поки немає.</p>
            )}
          </section>
        ) : null}

        {/* OUTCOMES */}
        <section>
          <Title
            title="Чому ви навчитесь"
            size="small"
          />

          <CardsList
            cards={
              course.outcomes?.map((outcome) => ({
                title: outcome,
              })) ?? []
            }
            variant="whatYouCanLearn"
          />

          {/* AUTHOR */}
          <section id="author">
            <Title title="Автор курсу" size="small" />
            <CourseAuthorCard author={course.author} />
          </section>

          {/* REVIEWS */}
          <section id="reviews">
          <OpenMore 
            title="Відгуки студентів"
            bttnTxt={
              isReviewsOpen
                ? 'Згорнути'
                : 'Дивитись всі відгуки'
            }
            size="small"
            type="expand"
            isOpen={isReviewsOpen}
            onClick={toggleReviews}
          />

          {isReviewsOpen && (
            <>
              {reviewsLoading ? (
                <p>Завантаження відгуків...</p>
              ) : reviews.length > 0 ? (
                <CardsList
                  cards={reviews}
                  review="studentReview"
                />
              ) : (

                <p>Відгуків поки немає.</p>
              )}

              {reviewsTotalPages > 1 && (
                <div>

                  <Button
                    title="Попередня"
                    variant="secondary"
                    size="medium"
                    disabled={reviewsPage === 1}
                    onClick={() =>
                      setReviewsPage((page) => page - 1)
                    }
                  />

                  <span>
                    {' '}
                    {reviewsPage} / {reviewsTotalPages}
                    {' '}
                  </span>

                  <Button
                    title="Наступна"
                    variant="secondary"
                    size="medium"
                    disabled={
                      reviewsPage === reviewsTotalPages
                    }
                    onClick={() =>
                      setReviewsPage((page) => page + 1)
                    }
                  />
                </div>
              )}
            </>
          )}
          </section>

        </section>
      </main>
    </Container>
  );
};

export default Course;


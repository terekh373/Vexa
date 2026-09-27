import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import styles from './Course.module.css';

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
import { CourseAuthorCard } from './CourseAuthorCard.jsx';
import { OpenMore } from '../../components/ui/openmore/OpenMore.jsx';
import LessonModule from '../../components/ui/module/LessonModule.jsx';
import CoursePageSkeleton from '../../components/ui/skeleton/course-page/CoursePageSkeleton.jsx';
import { addToCart, getCart } from '../../services/cartService.js';
import { enrollFreeCourse } from '../../services/learningService.js';
import Toast from '../../components/ui/toast/Toast.jsx';

import {
  createCourseReview,
  getCourse,
  getCourseReviews,
} from '../../services/coursesService.js';

import NotFound from '../not-found/NotFound.jsx';

const REVIEWS_PAGE_SIZE = 6;

const formatDuration = (seconds) => {
  if (!seconds) return '0 хв';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours} год ${minutes} хв`;
  if (hours > 0) return `${hours} год`;
  return `${minutes} хв`;
};

const formatPrice = (amount = 0, currency = 'UAH') => {
  if (amount === 0) return 'Безкоштовно';

  try {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
};

const formatLanguage = (language) => {
  const labels = {
    uk: 'Українська',
    en: 'Англійська',
  };

  return labels[language] ?? language ?? 'Не вказано';
};

const formatFileSize = (sizeBytes) => {
  const bytes = Number(sizeBytes);

  if (!Number.isFinite(bytes) || bytes <= 0) return null;

  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / (1024 ** index);

  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

const Course = () => {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isInCart, setIsInCart] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [toast, setToast] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        setCourse(null);
        setIsInCart(false);
        setReviews([]);
        setReviewsPage(1);
        setReviewsTotalPages(1);
        setReviewsError(false);
        setReviewRating(0);
        setReviewText('');
        setReviewSubmitError('');
        setReviewSuccess('');

        const data = await getCourse(idOrSlug);

        if (cancelled) return;

        if (!data) {
          setError('not-found');
          return;
        }

        setCourse(data);
      } catch {
        if (!cancelled) {
          setError('server-error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [idOrSlug]);

  useEffect(() => {
    if (!course?.id || !isReviewsOpen) return undefined;

    let cancelled = false;

    const loadReviews = async () => {
      try {
        setReviewsLoading(true);
        setReviewsError(false);

        const data = await getCourseReviews(
          course.id,
          reviewsPage,
          REVIEWS_PAGE_SIZE,
        );

        if (cancelled) return;

        setReviews(data.reviews ?? data.items ?? []);
        setReviewsTotalPages(
          Math.max(1, data.pagination?.totalPages ?? data.totalPages ?? 1),
        );
      } catch {
        if (!cancelled) {
          setReviews([]);
          setReviewsError(true);
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    };

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [course?.id, isReviewsOpen, reviewsPage, reviewsRefreshKey]);

  useEffect(() => {
    if (!course?.id) return undefined;

    if (course.hasAccess) {
      setIsInCart(false);
      return undefined;
    }

    let cancelled = false;

    const checkCart = async () => {
      try {
        const cart = await getCart();

        if (cancelled) return;

        const courseInCart = cart.items?.some(
          (item) => item.courseId === course.id,
        );

        setIsInCart(Boolean(courseInCart));
      } catch (error) {
        if (!cancelled) {
          console.error('Не вдалося перевірити кошик:', error);
        }
      }
    };

    checkCart();

    return () => {
      cancelled = true;
    };
  }, [course?.id, course?.hasAccess]);

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
          <div className={styles.errorState}>
            <h2>Не вдалося завантажити курс</h2>
            <p>Спробуйте оновити сторінку.</p>
          </div>
        </main>
      </Container>
    );
  }

  if (!course) return null;

  const author = course.author ?? {};
  const rating = course.rating ?? {};
  const coverUrl = course.cover?.url || InfoBg;
  const authorAvatarUrl = author.avatar?.url || authorAvatar;
  const isMaterial = course.type === 'MATERIAL';
  const isFreeCourse = !isMaterial && course.price?.amount === 0;
  const programLabel = isMaterial ? 'Матеріали' : 'Програма';

  const handlePurchase = async () => {
    if (isFreeCourse) {
      try {
        setAddingToCart(true);

        await enrollFreeCourse(course.id);

        navigate(routes.player(course.id));
      } catch (error) {
        console.error('Не вдалося записатися на безкоштовний курс:', error);

        setToast({
          message: 'Не вдалося розпочати навчання',
          type: 'error',
        });
      } finally {
        setAddingToCart(false);
      }

      return;
    }

    if (course.hasAccess) {
      navigate(routes.player(course.id));
      return;
    }

    if (isInCart) {
      navigate(routes.cart());
      return;
    }

    try {
      setAddingToCart(true);

      await addToCart(course.id);

      setIsInCart(true);

      setToast({
        message: 'Курс додано в кошик',
        type: 'success',
      });
    } catch (error) {
      console.error('Не вдалося додати курс у кошик:', error);

      setToast({
        message: 'Не вдалося додати курс у кошик',
        type: 'error',
      });
    } finally {
      setAddingToCart(false);
    }
  };

  // toast for wishlist
  // const handleAddToWishlist = async () => {
  //   try {
  //     await addToWishlist(course.id);
  //
  //     setToast({
  //       message: 'Курс додано в обране',
  //       type: 'success',
  //     });
  //   } catch (error) {
  //     console.error('Не вдалося додати курс в обране:', error);
  //
  //     setToast({
  //       message: 'Не вдалося додати курс в обране',
  //       type: 'error',
  //     });
  //   }
  // };

  const getPurchaseButtonTitle = () => {
    if (addingToCart && isFreeCourse) return 'Записуємо...';
    if (isFreeCourse) return 'Розпочати навчання';
    if (course.hasAccess) return 'Перейти до навчання';
    if (addingToCart) return 'Додаємо...';
    if (isInCart) return 'Вже в кошику';

    return 'Додати в кошик';
  };

  const toggleReviews = () => {
    setIsReviewsOpen((prev) => !prev);
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewSubmitError('Оберіть оцінку від 1 до 5 зірок.');
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewSubmitError('');
      setReviewSuccess('');

      const trimmedText = reviewText.trim();

      const result = await createCourseReview(course.id, {
        rating: reviewRating,
        ...(trimmedText ? { text: trimmedText } : {}),
      });

      setCourse((current) => (
        current
          ? {
              ...current,
              canReview: false,
              rating: {
                average: result.rating?.average ?? current.rating?.average ?? 0,
                count: result.rating?.count ?? current.rating?.count ?? 0,
              },
            }
          : current
      ));

      setReviewRating(0);
      setReviewText('');
      setReviewSuccess('Дякуємо! Ваш відгук опубліковано.');
      setReviewsPage(1);
      setIsReviewsOpen(true);
      setReviewsRefreshKey((value) => value + 1);
    } catch (submitError) {
      const status = submitError.response?.status;

      if (status === 409) {
        setReviewSubmitError('Ви вже залишили відгук на цей курс.');
      } else if (status === 403) {
        setReviewSubmitError(
          'Відгук можуть залишати лише користувачі з доступом до курсу.',
        );
      } else {
        setReviewSubmitError(
          'Не вдалося надіслати відгук. Спробуйте ще раз.',
        );
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <Container>
      <main className={styles.container}>
        <Toast
          message={toast?.message}
          type={toast?.type}
          onClose={() => setToast(null)}
        />

        <Breadcrumbs
          title="Головна"
          link={routes.home()}
          pages={`Курси / ${course.title}`}
        />

        <div className={styles.courseRow}>
          <div
            className={styles.courseMainInfo}
            style={{ backgroundImage: `url(${coverUrl})` }}
          >
            <div className={styles.heroContent}>
              <h2 className={styles.title}>{course.title}</h2>
              <p>{course.shortDescription}</p>

              <ul className={styles.listCoursePage}>
                <li className={styles.itemCoursePage}>
                  <img src={Star} alt="Рейтинг" />
                  <span>
                    {rating.average ?? 0} ({rating.count ?? 0} відгуків)
                  </span>
                </li>

                <li className={styles.itemCoursePage}>
                  <img src={Group} alt="Студенти" />
                  <span>{course.studentsCount ?? 0} студентів</span>
                </li>

                {!isMaterial && (
                  <>
                    <li className={styles.itemCoursePage}>
                      <img src={Clock} alt="Тривалість" />
                      <span>{formatDuration(course.durationSec)}</span>
                    </li>

                    <li className={styles.itemCoursePage}>
                      <img src={Book} alt="Уроки" />
                      <span>{course.lessonsCount ?? 0} уроків</span>
                    </li>
                  </>
                )}
              </ul>

              <div className={styles.author}>
                <img
                  src={authorAvatarUrl}
                  alt={author.name || 'Автор курсу'}
                />
                <div>
                  <span>{author.name || 'Автор курсу'}</span>
                  <span>{author.headline || ''}</span>
                </div>
              </div>
            </div>
          </div>

          <aside className={styles.coursePriceInfo}>
            <div className={styles.coursePrice}>
              <span>
                {formatPrice(course.price?.amount, course.price?.currency)}
              </span>
            </div>

            <div className={styles.courseRowBttn}>
              <Button
                title={getPurchaseButtonTitle()}
                variant="primary"
                size="medium"
                disabled={addingToCart}
                onClick={handlePurchase}
              />

              <Button
                title="Додати в обране"
                variant="secondary"
                size="medium"
                // onClick={handleAddToWishlist}
              />
            </div>

            <ul className={styles.priorityList}>
              <li>
                <div className={styles.checkBox}>
                  <img src={checkingIcon} alt="" aria-hidden="true" />
                </div>
                <span>Доступ назавжди</span>
              </li>

              <li>
                <div className={styles.checkBox}>
                  <img src={checkingIcon} alt="" aria-hidden="true" />
                </div>
                <span>Доступ на мобільних пристроях</span>
              </li>

              {!isMaterial && (
                <li>
                  <div className={styles.checkBox}>
                    <img src={checkingIcon} alt="" aria-hidden="true" />
                  </div>
                  <span>Сертифікат після завершення</span>
                </li>
              )}
            </ul>
          </aside>
        </div>

        <section id="about" className={styles.aboutCourseBox}>
          <div className={styles.courseDetails}>
            <nav
              className={styles.courseTabs}
              aria-label="Навігація по курсу"
            >
              <a href="#about" className={styles.linkItem}>
                Про курс
              </a>
              <a href="#program" className={styles.linkItem}>
                {programLabel}
              </a>
              <a href="#author" className={styles.linkItem}>
                Автор
              </a>
              <a href="#reviews" className={styles.linkItem}>
                Відгуки
              </a>
            </nav>

            <div className={styles.about}>
              <h3>Про курс</h3>
              <h4>{course.shortDescription}</h4>
              <p>{course.description}</p>
            </div>
          </div>

          <ul className={styles.courseInfo}>
            <li>
              <img src={checkBallIcon} alt="" aria-hidden="true" />
              <p>
                <span>Рівень: </span>
                <span>
                  {course.grade ? `${course.grade} клас` : 'Для всіх'}
                </span>
              </p>
            </li>

            <li>
              <img src={checkBallIcon} alt="" aria-hidden="true" />
              <p>
                <span>Формат: </span>
                <span>
                  {isMaterial ? 'Навчальний матеріал' : 'Відеокурс'}
                </span>
              </p>
            </li>

            <li>
              <img src={checkBallIcon} alt="" aria-hidden="true" />
              <p>
                <span>Мова: </span>
                <span>{formatLanguage(course.language)}</span>
              </p>
            </li>

            <li>
              <img src={checkBallIcon} alt="" aria-hidden="true" />
              <p>
                <span>Категорія: </span>
                <span>{course.category?.nameUk || 'Не вказано'}</span>
              </p>
            </li>
          </ul>
        </section>

        {!isMaterial ? (
          <section id="program" className={styles.lessonsBox}>
            <div className={styles.modulesBox}>
              <Title title="Програма курсу" size="small" />

              {course.modules?.length > 0 ? (
                course.modules.map((module) => (
                  <LessonModule key={module.id} module={module} />
                ))
              ) : (
                <p className={styles.emptyState}>
                  Програма курсу поки недоступна.
                </p>
              )}
            </div>

            <div className={styles.certificateBox}>
              <img src={certificate} alt="Сертифікат" />
              <p>Отримайте сертифікат після завершення курсу</p>
            </div>
          </section>
        ) : (
          <section id="program" className={styles.materialsBox}>
            <Title title="Матеріали" size="small" />

            {course.materials?.length > 0 ? (
              <div className={styles.materialsList}>
                {course.materials.map((material) => {
                  const fileSize = formatFileSize(material.sizeBytes);
                  const format = material.format?.toUpperCase();

                  return (
                    <article
                      className={styles.materialItem}
                      key={material.id}
                    >
                      <div>
                        <h4>{material.title || material.name}</h4>
                        <p>{material.name}</p>
                      </div>

                      <span>
                        {[format, fileSize].filter(Boolean).join(' · ') || 'Файл'}
                      </span>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className={styles.emptyState}>
                Матеріалів поки немає.
              </p>
            )}
          </section>
        )}

        <section className={styles.outcomesSection}>
          <Title title="Чого ви навчитеся" size="small" />

          {course.outcomes?.length > 0 ? (
            <CardsList
              cards={course.outcomes.map((outcome, index) => ({
                id: `${course.id}-outcome-${index}`,
                title: outcome,
              }))}
              variant="whatYouCanLearn"
            />
          ) : (
            <p className={styles.emptyState}>
              Результати навчання поки не додані.
            </p>
          )}
        </section>

        <section id="author">
          <Title title="Автор курсу" size="small" />
          <CourseAuthorCard author={author} />
        </section>

        <section id="reviews" className={styles.reviewsSection}>
          <OpenMore
            title="Відгуки студентів"
            bttnTxt={isReviewsOpen ? 'Згорнути' : 'Дивитись всі відгуки'}
            size="small"
            type="expand"
            isOpen={isReviewsOpen}
            onClick={toggleReviews}
          />

          {course.canReview && (
            <form
              className={styles.reviewForm}
              onSubmit={handleReviewSubmit}
            >
              <div className={styles.reviewFormHeader}>
                <div>
                  <h3>Залишити відгук</h3>
                  <p>
                    Оцініть курс від 1 до 5 зірок. Текст можна не додавати.
                  </p>
                </div>

                <div
                  className={styles.reviewStars}
                  role="radiogroup"
                  aria-label="Оцінка курсу"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        value <= reviewRating
                          ? styles.reviewStarActive
                          : styles.reviewStar
                      }
                      onClick={() => {
                        setReviewRating(value);
                        setReviewSubmitError('');
                      }}
                      aria-label={`${value} з 5`}
                      aria-pressed={reviewRating === value}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className={styles.reviewTextarea}
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                maxLength={4000}
                rows={4}
                placeholder="Напишіть кілька слів про курс (необов’язково)"
              />

              <div className={styles.reviewFormFooter}>
                <span>{reviewText.length}/4000</span>

                <Button
                  title={
                    reviewSubmitting
                      ? 'Надсилання...'
                      : 'Опублікувати відгук'
                  }
                  type="submit"
                  variant="primary"
                  size="medium"
                  disabled={reviewSubmitting}
                />
              </div>

              {reviewSubmitError && (
                <p
                  className={styles.reviewFormError}
                  role="alert"
                >
                  {reviewSubmitError}
                </p>
              )}
            </form>
          )}

          {reviewSuccess && (
            <p
              className={styles.reviewSuccess}
              role="status"
            >
              {reviewSuccess}
            </p>
          )}

          {isReviewsOpen && (
            <>
              {reviewsLoading ? (
                <p className={styles.emptyState}>
                  Завантаження відгуків...
                </p>
              ) : reviewsError ? (
                <p className={styles.errorText}>
                  Не вдалося завантажити відгуки.
                </p>
              ) : reviews.length > 0 ? (
                <CardsList
                  cards={reviews}
                  review="studentReview"
                />
              ) : (
                <p className={styles.emptyState}>
                  Відгуків поки немає.
                </p>
              )}

              {!reviewsLoading &&
                !reviewsError &&
                reviewsTotalPages > 1 && (
                  <div className={styles.reviewsPagination}>
                    <Button
                      title="Попередня"
                      variant="secondary"
                      size="medium"
                      disabled={reviewsPage === 1}
                      onClick={() =>
                        setReviewsPage((page) => Math.max(1, page - 1))
                      }
                    />

                    <span>
                      {reviewsPage} / {reviewsTotalPages}
                    </span>

                    <Button
                      title="Наступна"
                      variant="secondary"
                      size="medium"
                      disabled={reviewsPage === reviewsTotalPages}
                      onClick={() =>
                        setReviewsPage((page) =>
                          Math.min(reviewsTotalPages, page + 1)
                        )
                      }
                    />
                  </div>
                )}
            </>
          )}
        </section>
      </main>
    </Container>
  );
};

export default Course;
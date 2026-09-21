import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import styles from './AuthorCourses.module.css';
import { Container } from '../../components/layout/container/Container.jsx';
import CourseSkeleton from '../../components/ui/skeleton/CourseSkeleton.jsx';
import {
  deleteAuthorCourse,
  getAuthorCourses,
  unpublishAuthorCourse,
} from '../../services/authorCoursesService.js';

const STATUSES = [
  { value: '', label: 'Усі статуси' },
  { value: 'DRAFT', label: 'Чернетка' },
  { value: 'MODERATION', label: 'На модерації' },
  { value: 'PUBLISHED', label: 'Опубліковано' },
  { value: 'REJECTED', label: 'Відхилено' },
  { value: 'UNPUBLISHED', label: 'Знято з публікації' },
];

const STATUS_LABELS = Object.fromEntries(
  STATUSES.filter(({ value }) => value).map(({ value, label }) => [value, label]),
);

const EDITABLE_STATUSES = new Set(['DRAFT', 'REJECTED', 'UNPUBLISHED']);
const DELETABLE_STATUSES = new Set(['DRAFT', 'REJECTED']);

const TYPE_LABELS = {
  COURSE: 'Курс',
  MATERIAL: 'Матеріал',
};

const formatPrice = (amount = 0, currency = 'UAH') =>
  new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);

const formatRating = (rating) => {
  const value = Number(rating ?? 0);
  return Number.isFinite(value) ? value.toFixed(1) : '0.0';
};

const AuthorCourses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [courseToUnpublish, setCourseToUnpublish] = useState(null);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [unpublishError, setUnpublishError] = useState('');

  const status = searchParams.get('status') ?? '';
  const isKnownStatus = STATUSES.some((item) => item.value === status);
  const activeStatus = isKnownStatus ? status : '';

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const items = await getAuthorCourses(activeStatus || undefined);
      setCourses(items);
    } catch {
      setLoadError('Не вдалося завантажити курси. Перевірте з’єднання та спробуйте ще раз.');
    } finally {
      setIsLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (status && !isKnownStatus) {
      setSearchParams({}, { replace: true });
    }
  }, [isKnownStatus, setSearchParams, status]);

  const handleStatusChange = (event) => {
    const nextStatus = event.target.value;
    const params = new URLSearchParams(searchParams);

    if (nextStatus) {
      params.set('status', nextStatus);
    } else {
      params.delete('status');
    }

    setSearchParams(params);
  };

  const openDeleteModal = (course) => {
    setDeleteError('');
    setCourseToDelete(course);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setCourseToDelete(null);
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      await deleteAuthorCourse(courseToDelete.id);
      setCourses((current) => current.filter((course) => course.id !== courseToDelete.id));
      setCourseToDelete(null);
    } catch (error) {
      const message =
        error.response?.data?.error?.message ??
        'Не вдалося видалити курс. Спробуйте ще раз.';
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openUnpublishModal = (course) => {
    setUnpublishError('');
    setCourseToUnpublish(course);
  };

  const closeUnpublishModal = () => {
    if (isUnpublishing) return;
    setCourseToUnpublish(null);
    setUnpublishError('');
  };

  const confirmUnpublish = async () => {
    if (!courseToUnpublish) return;

    setIsUnpublishing(true);
    setUnpublishError('');

    try {
      await unpublishAuthorCourse(courseToUnpublish.id);
      setCourses((current) => {
        const updated = current.map((course) =>
          course.id === courseToUnpublish.id
            ? { ...course, status: 'UNPUBLISHED', rejectionReason: null }
            : course,
        );

        return activeStatus === 'PUBLISHED'
          ? updated.filter((course) => course.id !== courseToUnpublish.id)
          : updated;
      });
      setCourseToUnpublish(null);
    } catch (error) {
      const message =
        error.response?.data?.error?.message ??
        'Не вдалося зняти курс з публікації. Спробуйте ще раз.';
      setUnpublishError(message);
    } finally {
      setIsUnpublishing(false);
    }
  };

  const skeletons = useMemo(
    () => Array.from({ length: 4 }, (_, index) => <CourseSkeleton key={index} />),
    [],
  );

  return (
    <main className={styles.page}>
      <Container>
        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>Кабінет автора</p>
            <h1 className={styles.title}>Мої курси</h1>
            <p className={styles.subtitle}>Керуйте курсами, статусами та переходьте до конструктора.</p>
          </div>

          <Link className={styles.primaryAction} to={routes.authorCourseNew()}>
            Створити курс
          </Link>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.filterLabel} htmlFor="author-course-status">
            Статус
          </label>
          <select
            id="author-course-status"
            className={styles.statusFilter}
            value={activeStatus}
            onChange={handleStatusChange}
          >
            {STATUSES.map((item) => (
              <option key={item.value || 'all'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading && <div className={styles.skeletonGrid}>{skeletons}</div>}

        {!isLoading && loadError && (
          <section className={styles.stateCard} role="alert">
            <h2>Не вдалося завантажити курси</h2>
            <p>{loadError}</p>
            <button type="button" className={styles.retryButton} onClick={loadCourses}>
              Спробувати ще
            </button>
          </section>
        )}

        {!isLoading && !loadError && courses.length === 0 && (
          <section className={styles.stateCard}>
            <h2>{activeStatus ? 'Курсів із таким статусом немає' : 'Створіть перший курс'}</h2>
            <p>
              {activeStatus
                ? 'Змініть фільтр або створіть новий курс.'
                : 'Почніть із чернетки та наповніть її у конструкторі.'}
            </p>
            <Link className={styles.primaryAction} to={routes.authorCourseNew()}>
              Створити курс
            </Link>
          </section>
        )}

        {!isLoading && !loadError && courses.length > 0 && (
          <div className={styles.courseList}>
            {courses.map((course) => {
              const canEdit = EDITABLE_STATUSES.has(course.status);
              const canDelete = DELETABLE_STATUSES.has(course.status);
              const canUnpublish = course.status === 'PUBLISHED';

              return (
                <article className={styles.courseCard} key={course.id}>
                  <div className={styles.coverWrap}>
                    {course.coverUrl ? (
                      <img className={styles.cover} src={course.coverUrl} alt="" />
                    ) : (
                      <div className={styles.coverPlaceholder}>Без обкладинки</div>
                    )}
                  </div>

                  <div className={styles.courseMain}>
                    <div className={styles.courseTopline}>
                      <span className={`${styles.statusBadge} ${styles[`status${course.status}`] ?? ''}`}>
                        {STATUS_LABELS[course.status] ?? course.status}
                      </span>
                      <span className={styles.courseType}>{TYPE_LABELS[course.type] ?? course.type}</span>
                    </div>

                    <h2 className={styles.courseTitle}>{course.title}</h2>

                    {course.status === 'REJECTED' && course.rejectionReason && (
                      <div className={styles.rejectionReason}>
                        <strong>Причина відхилення:</strong> {course.rejectionReason}
                      </div>
                    )}

                    <dl className={styles.metrics}>
                      <div>
                        <dt>Ціна</dt>
                        <dd>{formatPrice(course.priceAmount, course.currency)}</dd>
                      </div>
                      <div>
                        <dt>Рейтинг</dt>
                        <dd>★ {formatRating(course.ratingAvg)}</dd>
                      </div>
                      <div>
                        <dt>Продажі</dt>
                        <dd>{course.studentsCount ?? 0}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className={styles.actions}>
                    {canEdit ? (
                      <Link className={styles.editButton} to={routes.authorCourseEdit(course.id)}>
                        Редагувати
                      </Link>
                    ) : (
                      <button type="button" className={styles.editButton} disabled title="Курс зараз не можна редагувати">
                        Редагувати
                      </button>
                    )}

                    {canUnpublish && (
                      <button
                        type="button"
                        className={styles.unpublishButton}
                        onClick={() => openUnpublishModal(course)}
                      >
                        Зняти з публікації
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => openDeleteModal(course)}
                      disabled={!canDelete}
                      title={canDelete ? 'Видалити курс' : 'Цей статус не дозволяє видалення'}
                    >
                      Видалити
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Container>

      {courseToUnpublish && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeUnpublishModal}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="unpublish-course-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="unpublish-course-title">Зняти курс з публікації?</h2>
            <p>
              «{courseToUnpublish.title}» зникне з каталогу. Користувачі, які вже мають доступ,
              зможуть продовжити навчання. Після редагування курс можна знову подати на модерацію.
            </p>

            {unpublishError && <p className={styles.modalError}>{unpublishError}</p>}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={closeUnpublishModal}
                disabled={isUnpublishing}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={styles.confirmUnpublishButton}
                onClick={confirmUnpublish}
                disabled={isUnpublishing}
              >
                {isUnpublishing ? 'Знімаємо…' : 'Зняти з публікації'}
              </button>
            </div>
          </div>
        </div>
      )}

      {courseToDelete && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeDeleteModal}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-course-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="delete-course-title">Видалити курс?</h2>
            <p>
              «{courseToDelete.title}» зникне зі списку. Історія замовлень при цьому не видаляється.
            </p>

            {deleteError && <p className={styles.modalError}>{deleteError}</p>}

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={closeDeleteModal} disabled={isDeleting}>
                Скасувати
              </button>
              <button type="button" className={styles.confirmDeleteButton} onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Видаляємо…' : 'Видалити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AuthorCourses;

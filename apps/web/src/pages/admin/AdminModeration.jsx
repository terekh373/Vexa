import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { listAdminCourses } from '../../services/adminService.js';
import styles from './Admin.module.css';

const STATUS_OPTIONS = [
  ['MODERATION', 'На модерації'],
  ['PUBLISHED', 'Опубліковані'],
  ['REJECTED', 'Відхилені'],
  ['UNPUBLISHED', 'Зняті з публікації'],
  ['DRAFT', 'Чернетки'],
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS);

const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

const formatPrice = (amount, currency) => {
  if (!Number.isFinite(Number(amount))) return '—';
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: currency || 'UAH',
    maximumFractionDigits: 2,
  }).format(Number(amount) / 100);
};

const AdminModeration = () => {
  const [status, setStatus] = useState('MODERATION');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await listAdminCourses({ status, page, limit: 20 });
      setResult(data);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Не вдалося завантажити курси.');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const changeStatus = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>Курси</h2>
          <p>Черга `MODERATION` відсортована від найстаріших заявок до новіших.</p>
        </div>
        <label className={styles.inlineField}>
          <span>Статус</span>
          <select value={status} onChange={changeStatus}>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.stateCard}>Завантажуємо курси…</div>
      ) : result.items.length === 0 ? (
        <div className={styles.stateCard}>Курсів із таким статусом немає.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Курс</th>
                <th>Автор</th>
                <th>Категорія</th>
                <th>Подано</th>
                <th>Ціна</th>
                <th>Статус</th>
                <th aria-label="Дії" />
              </tr>
            </thead>
            <tbody>
              {result.items.map((course) => (
                <tr key={course.id}>
                  <td>
                    <strong>{course.title}</strong>
                    <span className={styles.muted}>{course.type} · {course.lessonsCount ?? 0} уроків</span>
                  </td>
                  <td>
                    {course.author?.fullName || '—'}
                    <span className={styles.muted}>{course.author?.email || ''}</span>
                  </td>
                  <td>{course.category?.nameUk || '—'}</td>
                  <td>{formatDate(course.submittedAt || course.updatedAt)}</td>
                  <td>{formatPrice(course.priceAmount, course.currency)}</td>
                  <td><span className={`${styles.badge} ${styles[`status${course.status}`] || ''}`}>{STATUS_LABELS[course.status] || course.status}</span></td>
                  <td>
                    <Link className={styles.secondaryButton} to={routes.adminModerationCourse(course.id)}>
                      Переглянути
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.pagination}>
        <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}>
          Назад
        </button>
        <span>Сторінка {page} з {Math.max(1, result.totalPages || 1)} · усього {result.total ?? 0}</span>
        <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= (result.totalPages || 1) || loading}>
          Далі
        </button>
      </div>
    </section>
  );
};

export default AdminModeration;

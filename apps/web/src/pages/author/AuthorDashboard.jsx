import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import { getAuthorDashboard } from '../../services/authorFinanceService.js';
import styles from './AuthorCabinet.module.css';

const PERIODS = [
  { value: '7d', label: '7 днів' },
  { value: '30d', label: '30 днів' },
  { value: '90d', label: '90 днів' },
  { value: 'all', label: 'Увесь час' },
];

const COURSE_STATUSES = [
  { key: 'PUBLISHED', label: 'Опубліковано' },
  { key: 'MODERATION', label: 'На модерації' },
  { key: 'DRAFT', label: 'Чернетки' },
  { key: 'REJECTED', label: 'Відхилено' },
  { key: 'UNPUBLISHED', label: 'Знято з публікації' },
];

const formatMoney = (amount = 0, currency = 'UAH') =>
  new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0) / 100);

const formatRating = (value) => {
  const rating = Number(value ?? 0);
  return Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
};

const AuthorDashboard = () => {
  const [period, setPeriod] = useState('30d');
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    setError('');

    try {
      setDashboard(await getAuthorDashboard(period));
    } catch (requestError) {
      if (!silent) {
        setError(
          requestError.response?.data?.error?.message ||
            'Не вдалося завантажити дані дашборда. Спробуйте ще раз.',
        );
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadDashboard();
    const intervalId = window.setInterval(() => loadDashboard({ silent: true }), 30_000);
    return () => window.clearInterval(intervalId);
  }, [loadDashboard]);

  const courseTotal = useMemo(
    () => Object.values(dashboard?.coursesByStatus ?? {}).reduce((sum, value) => sum + Number(value || 0), 0),
    [dashboard],
  );

  return (
    <main className={styles.page}>
      <Container>
        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>Кабінет автора</p>
            <h1 className={styles.title}>Дашборд</h1>
            <p className={styles.subtitle}>Продажі, дохід, учні та рейтинг ваших курсів.</p>
          </div>

          <div className={styles.periodTabs} aria-label="Період статистики">
            {PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${styles.periodButton} ${period === item.value ? styles.periodButtonActive : ''}`}
                onClick={() => setPeriod(item.value)}
                aria-pressed={period === item.value}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className={styles.metricsGrid} aria-label="Завантаження статистики">
            {Array.from({ length: 4 }, (_, index) => (
              <div className={styles.metricSkeleton} key={index} />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <section className={styles.stateCard} role="alert">
            <h2>Не вдалося завантажити статистику</h2>
            <p>{error}</p>
            <button type="button" className={styles.primaryButton} onClick={() => loadDashboard()}>
              Спробувати ще
            </button>
          </section>
        )}

        {!isLoading && !error && dashboard && (
          <>
            <section className={styles.metricsGrid} aria-label="Основні показники">
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Продажі</span>
                <strong className={styles.metricValue}>{dashboard.salesCount ?? 0}</strong>
                <span className={styles.metricHint}>за вибраний період</span>
              </article>

              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Дохід</span>
                <strong className={styles.metricValue}>
                  {formatMoney(dashboard.revenueAmount, dashboard.currency)}
                </strong>
                <span className={styles.metricHint}>частка автора</span>
              </article>

              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Учні</span>
                <strong className={styles.metricValue}>{dashboard.studentsCount ?? 0}</strong>
                <span className={styles.metricHint}>активні за період</span>
              </article>

              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Рейтинг</span>
                <strong className={styles.metricValue}>★ {formatRating(dashboard.ratingAvg)}</strong>
                <span className={styles.metricHint}>{dashboard.reviewsCount ?? 0} відгуків</span>
              </article>
            </section>

            <section className={styles.dashboardGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.panelEyebrow}>Курси</p>
                    <h2>Статуси курсів</h2>
                  </div>
                  <Link to={routes.authorCourses()} className={styles.textLink}>
                    Усі курси
                  </Link>
                </div>

                <div className={styles.statusList}>
                  {COURSE_STATUSES.map((item) => {
                    const count = Number(dashboard.coursesByStatus?.[item.key] ?? 0);
                    const percent = courseTotal > 0 ? Math.round((count / courseTotal) * 100) : 0;

                    return (
                      <div className={styles.statusRow} key={item.key}>
                        <div className={styles.statusRowTop}>
                          <span>{item.label}</span>
                          <strong>{count}</strong>
                        </div>
                        <div className={styles.progressTrack} aria-hidden="true">
                          <span className={styles.progressFill} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className={`${styles.panel} ${styles.quickPanel}`}>
                <p className={styles.panelEyebrow}>Швидкі дії</p>
                <h2>Керуйте кабінетом</h2>
                <p className={styles.panelText}>
                  Перейдіть до балансу, відгуків або створіть новий курс.
                </p>
                <div className={styles.quickActions}>
                  <Link className={styles.primaryLink} to={routes.authorCourseNew()}>
                    Створити курс
                  </Link>
                  <Link className={styles.secondaryLink} to={routes.authorBalance()}>
                    Баланс і виплати
                  </Link>
                  <Link className={styles.secondaryLink} to={routes.authorReviews()}>
                    Відгуки учнів
                  </Link>
                </div>
              </article>
            </section>
          </>
        )}
      </Container>
    </main>
  );
};

export default AuthorDashboard;

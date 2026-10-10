import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import {
  getAuthorReviews,
  replyToAuthorReview,
} from '../../services/authorFinanceService.js';
import styles from './AuthorCabinet.module.css';

const PAGE_SIZE = 10;

const formatDate = (value) =>
  new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));

const AuthorReviews = () => {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], page: 1, totalPages: 1 });
  const [drafts, setDrafts] = useState({});
  const [replyErrors, setReplyErrors] = useState({});
  const [savingReviewId, setSavingReviewId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const data = await getAuthorReviews(page, PAGE_SIZE);
      setResult(data);
      setDrafts((current) => {
        const next = { ...current };
        for (const review of data.items ?? []) {
          if (next[review.id] === undefined) next[review.id] = review.authorReply ?? '';
        }
        return next;
      });
    } catch (requestError) {
      setLoadError(
        requestError.response?.data?.error?.message ||
          'Не вдалося завантажити відгуки. Спробуйте ще раз.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const submitReply = async (reviewId) => {
    const text = (drafts[reviewId] ?? '').trim();
    if (!text) {
      setReplyErrors((current) => ({ ...current, [reviewId]: 'Напишіть відповідь перед збереженням.' }));
      return;
    }

    setSavingReviewId(reviewId);
    setReplyErrors((current) => ({ ...current, [reviewId]: '' }));

    try {
      const updated = await replyToAuthorReview(reviewId, text);
      setResult((current) => ({
        ...current,
        items: current.items.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                authorReply: updated.authorReply,
                authorRepliedAt: updated.authorRepliedAt,
                hasReply: true,
              }
            : review,
        ),
      }));
      setDrafts((current) => ({ ...current, [reviewId]: updated.authorReply ?? text }));
    } catch (requestError) {
      setReplyErrors((current) => ({
        ...current,
        [reviewId]:
          requestError.response?.data?.error?.message ||
          'Не вдалося зберегти відповідь. Спробуйте ще раз.',
      }));
    } finally {
      setSavingReviewId(null);
    }
  };

  return (
    <main className={styles.page}>
      <Container>
        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>Кабінет автора</p>
            <h1 className={styles.title}>Відгуки</h1>
            <p className={styles.subtitle}>Читайте відгуки учнів і відповідайте від імені автора курсу.</p>
          </div>
        </div>

        {isLoading && <div className={styles.largeSkeleton} aria-label="Завантаження відгуків" />}

        {!isLoading && loadError && (
          <section className={styles.stateCard} role="alert">
            <h2>Не вдалося завантажити відгуки</h2>
            <p>{loadError}</p>
            <button type="button" className={styles.primaryButton} onClick={loadReviews}>
              Спробувати ще
            </button>
          </section>
        )}

        {!isLoading && !loadError && result.items.length === 0 && (
          <section className={styles.stateCard}>
            <h2>Відгуків поки немає</h2>
            <p>Коли учні залишать опубліковані відгуки, вони з’являться тут.</p>
          </section>
        )}

        {!isLoading && !loadError && result.items.length > 0 && (
          <>
            <div className={styles.reviewsList}>
              {result.items.map((review) => (
                <article className={styles.reviewCard} key={review.id}>
                  <div className={styles.reviewHeader}>
                    <div>
                      <Link className={styles.reviewCourse} to={routes.course(review.course?.slug || review.course?.id)}>
                        {review.course?.title || 'Курс'}
                      </Link>
                      <div className={styles.reviewMeta}>
                        <span>{review.user?.fullName || 'Учень'}</span>
                        <span>·</span>
                        <span>{formatDate(review.createdAt)}</span>
                      </div>
                    </div>
                    <div className={styles.ratingBadge} aria-label={`Оцінка ${review.rating} з 5`}>
                      ★ {review.rating}/5
                    </div>
                  </div>

                  <p className={styles.reviewText}>{review.text || 'Відгук без тексту.'}</p>

                  {review.hasReply && (
                    <div className={styles.currentReply}>
                      <span className={styles.replyLabel}>Ваша відповідь</span>
                      <p>{review.authorReply}</p>
                      {review.authorRepliedAt && <small>Оновлено {formatDate(review.authorRepliedAt)}</small>}
                    </div>
                  )}

                  <div className={styles.replyForm}>
                    <label htmlFor={`reply-${review.id}`}>
                      {review.hasReply ? 'Редагувати відповідь' : 'Відповісти на відгук'}
                    </label>
                    <textarea
                      id={`reply-${review.id}`}
                      value={drafts[review.id] ?? ''}
                      maxLength={4000}
                      rows={4}
                      onChange={(event) => {
                        setDrafts((current) => ({ ...current, [review.id]: event.target.value }));
                        setReplyErrors((current) => ({ ...current, [review.id]: '' }));
                      }}
                    />
                    <div className={styles.replyFooter}>
                      <div>
                        <span className={styles.charCount}>{(drafts[review.id] ?? '').length}/4000</span>
                        {replyErrors[review.id] && (
                          <span className={styles.fieldError} role="alert">{replyErrors[review.id]}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => submitReply(review.id)}
                        disabled={savingReviewId === review.id}
                      >
                        {savingReviewId === review.id
                          ? 'Зберігаємо…'
                          : review.hasReply
                            ? 'Оновити відповідь'
                            : 'Відповісти'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.paginationRow}>
              <button
                type="button"
                className={styles.pageButton}
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Назад
              </button>
              <span>Сторінка {result.page ?? page} з {Math.max(1, result.totalPages ?? 1)}</span>
              <button
                type="button"
                className={styles.pageButton}
                disabled={page >= (result.totalPages ?? 1)}
                onClick={() => setPage((current) => current + 1)}
              >
                Далі
              </button>
            </div>
          </>
        )}
      </Container>
    </main>
  );
};

export default AuthorReviews;

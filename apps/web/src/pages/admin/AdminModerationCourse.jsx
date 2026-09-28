import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import {
  getAdminCourse,
  moderateAdminCourse,
  unpublishAdminCourse,
} from '../../services/adminService.js';
import styles from './Admin.module.css';

const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  const minutes = Math.round(value / 60);
  return minutes > 0 ? `${minutes} хв` : '—';
};

const AdminModerationCourse = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const loadCourse = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setCourse(await getAdminCourse(id));
    } catch (requestError) {
      setError(requestError.response?.status === 404 ? 'Курс не знайдено.' : 'Не вдалося завантажити курс.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const lessonCount = useMemo(
    () => course?.modules?.reduce((sum, module) => sum + (module.lessons?.length || 0), 0) ?? 0,
    [course],
  );

  const runAction = async (action) => {
    if (!course) return;

    const trimmedComment = comment.trim();
    if ((action === 'REJECT' || action === 'UNPUBLISH') && !trimmedComment) {
      setActionError('Коментар обов’язковий для цієї дії.');
      return;
    }

    setBusyAction(action);
    setActionError('');
    setActionSuccess('');

    try {
      const updated = action === 'UNPUBLISH'
        ? await unpublishAdminCourse(course.id, trimmedComment)
        : await moderateAdminCourse(course.id, {
            action,
            ...(trimmedComment ? { comment: trimmedComment } : {}),
          });
      setCourse(updated);
      setComment('');
      setActionSuccess(
        action === 'APPROVE'
          ? 'Курс опубліковано.'
          : action === 'REJECT'
            ? 'Курс відхилено.'
            : 'Курс знято з публікації.',
      );
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        setActionError('Курс уже оброблено. Оновіть сторінку, щоб побачити актуальний статус.');
      } else {
        setActionError(requestError.response?.data?.error?.message || 'Не вдалося виконати дію.');
      }
    } finally {
      setBusyAction('');
    }
  };

  if (loading) return <section className={styles.section}><div className={styles.stateCard}>Завантажуємо курс…</div></section>;
  if (error || !course) return <section className={styles.section}><div className={styles.errorBanner}>{error || 'Курс не знайдено.'}</div></section>;

  return (
    <section className={styles.section}>
      <Link className={styles.backLink} to={routes.adminModeration()}>← До списку курсів</Link>

      <div className={styles.detailHeader}>
        <div>
          <span className={`${styles.badge} ${styles[`status${course.status}`] || ''}`}>{course.status}</span>
          <h2>{course.title}</h2>
          <p>{course.shortDescription || course.description || 'Опис не заповнено.'}</p>
        </div>
        <dl className={styles.summaryGrid}>
          <div><dt>Автор</dt><dd>{course.author?.fullName || '—'}<span>{course.author?.email || ''}</span></dd></div>
          <div><dt>Категорія</dt><dd>{course.category?.nameUk || '—'}</dd></div>
          <div><dt>Уроків</dt><dd>{lessonCount}</dd></div>
          <div><dt>Тривалість</dt><dd>{formatDuration(course.durationSec)}</dd></div>
          <div><dt>Подано</dt><dd>{formatDate(course.submittedAt)}</dd></div>
          <div><dt>Мова / клас</dt><dd>{course.language || '—'} / {course.grade || '—'}</dd></div>
        </dl>
      </div>

      {(course.status === 'MODERATION' || course.status === 'PUBLISHED') && (
        <div className={styles.actionCard}>
          <h3>{course.status === 'PUBLISHED' ? 'Зняти з публікації' : 'Рішення модератора'}</h3>
          <label className={styles.field}>
            <span>Коментар {course.status === 'PUBLISHED' ? '(обов’язковий)' : '(обов’язковий для відхилення)'}</span>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} placeholder="Напишіть коментар автору" />
          </label>
          {actionError && <p className={styles.fieldError}>{actionError}</p>}
          {actionSuccess && <p className={styles.successText}>{actionSuccess}</p>}
          <div className={styles.actionRow}>
            {course.status === 'MODERATION' ? (
              <>
                <button type="button" className={styles.primaryButton} onClick={() => runAction('APPROVE')} disabled={Boolean(busyAction)}>
                  {busyAction === 'APPROVE' ? 'Обробляємо…' : 'Схвалити'}
                </button>
                <button type="button" className={styles.dangerButton} onClick={() => runAction('REJECT')} disabled={Boolean(busyAction) || !comment.trim()}>
                  {busyAction === 'REJECT' ? 'Обробляємо…' : 'Відхилити'}
                </button>
              </>
            ) : (
              <button type="button" className={styles.dangerButton} onClick={() => runAction('UNPUBLISH')} disabled={Boolean(busyAction) || !comment.trim()}>
                {busyAction === 'UNPUBLISH' ? 'Обробляємо…' : 'Зняти з публікації'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className={styles.twoColumns}>
        <div>
          <h3 className={styles.subheading}>Вміст курсу</h3>
          <div className={styles.moduleList}>
            {(course.modules || []).map((module, moduleIndex) => (
              <article className={styles.moduleCard} key={module.id}>
                <h4>Модуль {moduleIndex + 1}. {module.title}</h4>
                {(module.lessons || []).length === 0 ? (
                  <p className={styles.muted}>Уроків немає.</p>
                ) : (
                  <div className={styles.lessonList}>
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div className={styles.lessonCard} key={lesson.id}>
                        <div className={styles.lessonTopline}>
                          <strong>{lessonIndex + 1}. {lesson.title}</strong>
                          <span>{lesson.type}{lesson.isFreePreview ? ' · безкоштовний перегляд' : ''}</span>
                        </div>
                        {lesson.textContent && <p>{lesson.textContent}</p>}
                        {lesson.video && <p className={styles.muted}>Відео: {lesson.video.originalName || lesson.video.id} · {formatDuration(lesson.video.durationSec)}</p>}
                        {(lesson.files || []).length > 0 && (
                          <ul className={styles.fileList}>
                            {lesson.files.map((entry) => <li key={entry.id}>{entry.file?.originalName || entry.fileId}</li>)}
                          </ul>
                        )}
                        {lesson.quiz && (
                          <div className={styles.quizBox}>
                            <strong>Тест: {lesson.quiz.title || 'Без назви'}</strong>
                            <span>Питань: {lesson.quiz.questions?.length ?? 0} · прохідний бал: {lesson.quiz.passScore}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>

        <aside>
          <h3 className={styles.subheading}>Історія модерації</h3>
          <div className={styles.historyList}>
            {(course.moderationHistory || []).length === 0 ? (
              <div className={styles.stateCard}>Записів ще немає.</div>
            ) : course.moderationHistory.map((entry) => (
              <div className={styles.historyItem} key={entry.id}>
                <strong>{entry.action}</strong>
                <span>{entry.fromStatus || '—'} → {entry.toStatus || '—'}</span>
                <span>{formatDate(entry.createdAt)}</span>
                {entry.moderator?.fullName && <span>Модератор: {entry.moderator.fullName}</span>}
                {entry.comment && <p>{entry.comment}</p>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default AdminModerationCourse;

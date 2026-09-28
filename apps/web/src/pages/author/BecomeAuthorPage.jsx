import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import Button from '../../components/ui/buttons/Button.jsx';
import { useAuth } from '../../context/auth-context.js';
import {
  activateAuthorProfile,
  getPublicAuthorProfile,
  updateAuthorProfile,
} from '../../services/authorProfileService.js';
import styles from './BecomeAuthorPage.module.css';

const EMPTY_FORM = {
  displayName: '',
  headline: '',
  bio: '',
};

const apiFieldErrors = (error) =>
  (error.response?.data?.error?.details ?? []).reduce((result, detail) => {
    if (detail?.field && detail?.message && !result[detail.field]) {
      result[detail.field] = detail.message;
    }
    return result;
  }, {});

const BecomeAuthorPage = () => {
  const navigate = useNavigate();
  const { user, applyAuthSession } = useAuth();
  const isAuthor = user?.roles?.includes('AUTHOR') ?? false;

  const [values, setValues] = useState({
    ...EMPTY_FORM,
    displayName: user?.fullName ?? '',
  });
  const [loadingProfile, setLoadingProfile] = useState(isAuthor);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isAuthor || !user?.id) {
      setLoadingProfile(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingProfile(true);

    getPublicAuthorProfile(user.id)
      .then((profile) => {
        if (cancelled) return;

        if (!profile) {
          setFormError('Профіль автора не знайдено. Зверніться до підтримки.');
          return;
        }

        setValues({
          displayName: profile.displayName ?? user.fullName ?? '',
          headline: profile.headline ?? '',
          bio: profile.bio ?? '',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFormError('Не вдалося завантажити профіль автора. Спробуйте ще раз.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthor, user?.fullName, user?.id]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
    setSuccessMessage('');
  };

  const validate = () => {
    const nextErrors = {};
    const displayName = values.displayName.trim();
    const headline = values.headline.trim();
    const bio = values.bio.trim();

    if (displayName.length < 2) {
      nextErrors.displayName = "Ім'я автора має містити щонайменше 2 символи";
    } else if (displayName.length > 160) {
      nextErrors.displayName = "Ім'я автора не може бути довшим за 160 символів";
    }

    if (headline.length > 255) {
      nextErrors.headline = 'Заголовок не може бути довшим за 255 символів';
    }

    if (bio.length > 5000) {
      nextErrors.bio = 'Опис не може бути довшим за 5000 символів';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!validate()) return;

    const payload = {
      displayName: values.displayName.trim(),
      headline: values.headline.trim() || null,
      bio: values.bio.trim() || null,
    };

    setSubmitting(true);

    try {
      if (isAuthor) {
        await updateAuthorProfile(payload);
        setSuccessMessage('Профіль автора оновлено.');
        return;
      }

      const result = await activateAuthorProfile(payload);
      applyAuthSession(result);
      navigate(routes.authorCourseNew(), { replace: true });
    } catch (error) {
      const fieldErrors = apiFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);

      const status = error.response?.status;
      if (status === 409) {
        setFormError('Профіль автора вже активовано. Оновіть сторінку та спробуйте ще раз.');
      } else if (status === 403) {
        setFormError('Активація профілю автора недоступна для цього акаунта.');
      } else if (Object.keys(fieldErrors).length === 0) {
        setFormError('Не вдалося зберегти профіль автора. Спробуйте ще раз.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile) {
    return (
      <Container>
        <div className={styles.state}>Завантаження профілю автора...</div>
      </Container>
    );
  }

  return (
    <Container>
      <main className={styles.page}>
        <Breadcrumbs title="Головна" link={routes.home()} pages="Стати автором" />

        <div className={styles.layout}>
          <section className={styles.intro}>
            <span className={styles.eyebrow}>{isAuthor ? 'Профіль автора' : 'Vexa для авторів'}</span>
            <h1>{isAuthor ? 'Редагуйте свій профіль' : 'Почніть ділитися знаннями'}</h1>
            <p>
              {isAuthor
                ? 'Ці дані бачать студенти на сторінці вашого профілю та курсу.'
                : 'Активуйте профіль автора один раз — без окремої реєстрації. Після цього одразу можна створювати курс або матеріал.'}
            </p>

            <div className={styles.steps}>
              <div><strong>1</strong><span>Заповніть профіль</span></div>
              <div><strong>2</strong><span>Створіть перший курс</span></div>
              <div><strong>3</strong><span>Подайте його на модерацію</span></div>
            </div>
          </section>

          <section className={styles.formCard}>
            <h2>{isAuthor ? 'Дані профілю' : 'Активація профілю автора'}</h2>
            <p className={styles.hint}>Поле з ім’ям обов’язкове, решту можна додати пізніше.</p>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <label className={styles.field}>
                <span>Ім’я автора</span>
                <input
                  name="displayName"
                  value={values.displayName}
                  onChange={updateField}
                  maxLength={160}
                  aria-invalid={Boolean(errors.displayName)}
                  placeholder="Наприклад, Оксана Петренко"
                />
                {errors.displayName && <small className={styles.error}>{errors.displayName}</small>}
              </label>

              <label className={styles.field}>
                <span>Короткий заголовок</span>
                <input
                  name="headline"
                  value={values.headline}
                  onChange={updateField}
                  maxLength={255}
                  aria-invalid={Boolean(errors.headline)}
                  placeholder="Викладач математики · 8 років досвіду"
                />
                {errors.headline && <small className={styles.error}>{errors.headline}</small>}
              </label>

              <label className={styles.field}>
                <span>Про себе</span>
                <textarea
                  name="bio"
                  value={values.bio}
                  onChange={updateField}
                  maxLength={5000}
                  rows={7}
                  aria-invalid={Boolean(errors.bio)}
                  placeholder="Розкажіть студентам про досвід, підхід до навчання та експертизу."
                />
                <div className={styles.counter}>{values.bio.length}/5000</div>
                {errors.bio && <small className={styles.error}>{errors.bio}</small>}
              </label>

              {formError && <p className={styles.formError} role="alert">{formError}</p>}
              {successMessage && <p className={styles.success} role="status">{successMessage}</p>}

              <div className={styles.actions}>
                {isAuthor && (
                  <Button
                    title="Переглянути профіль"
                    variant="secondary"
                    onClick={() => navigate(routes.authorProfile(user.id))}
                  />
                )}
                <Button
                  title={submitting ? 'Збереження...' : isAuthor ? 'Зберегти зміни' : 'Стати автором'}
                  type="submit"
                  disabled={submitting}
                />
              </div>
            </form>
          </section>
        </div>
      </main>
    </Container>
  );
};

export default BecomeAuthorPage;

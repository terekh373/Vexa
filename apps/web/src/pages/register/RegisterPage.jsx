import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema, routes } from '@vexa/shared';

import { useAuth } from '../../context/auth-context.js';
import { API } from '../../api/config.js';
import styles from '../auth/AuthForm.module.css';

const mapIssues = (issues) =>
  issues.reduce((result, issue) => {
    const field = issue.path?.[0] ?? 'form';
    if (!result[field]) result[field] = issue.message;
    return result;
  }, {});

const apiFieldErrors = (error) =>
  (error.response?.data?.error?.details ?? []).reduce((result, detail) => {
    if (detail?.field && detail?.message && !result[detail.field]) {
      result[detail.field] = detail.message;
    }
    return result;
  }, {});

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    email: '',
    password: '',
    fullName: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, type, value, checked } = event.target;
    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  };

  const startGoogleLogin = () => {
    window.location.assign(`${API.replace(/\/$/, '')}/auth/google`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // navigate('/settings'); 
    // return; 
    // ці рядки для перевірки фронту
    setFormError('');

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(mapIssues(parsed.error.issues));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await register(parsed.data);
      navigate(routes.login(), { replace: true, state: { registered: true } });
    } catch (error) {
      const status = error.response?.status;
      const fieldErrors = apiFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);

      if (status === 429) {
        setFormError('Забагато спроб реєстрації. Зачекайте та спробуйте ще раз пізніше.');
      } else if (status === 409) {
        setErrors((current) => ({ ...current, email: 'Користувач із таким email уже існує.' }));
      } else if (Object.keys(fieldErrors).length === 0) {
        setFormError('Не вдалося зареєструватися. Перевірте з’єднання та спробуйте ще раз.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Реєстрація</h1>
          <p className={styles.subtitle}>Створіть акаунт Vexa та підтвердьте email.</p>
        </div>

        <button className={styles.submit} type="button" onClick={startGoogleLogin}>
          Увійти через Google
        </button>

        <p className={styles.subtitle} style={{ textAlign: 'center', margin: '14px 0' }}>або</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            <span className={styles.label}>Ім’я та прізвище</span>
            <input
              className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
              type="text"
              name="fullName"
              autoComplete="name"
              value={values.fullName}
              onChange={updateField}
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName && <span className={styles.error}>{errors.fullName}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              type="email"
              name="email"
              autoComplete="email"
              value={values.email}
              onChange={updateField}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <span className={styles.error}>{errors.email}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Пароль</span>
            <input
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              type="password"
              name="password"
              autoComplete="new-password"
              value={values.password}
              onChange={updateField}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password && <span className={styles.error}>{errors.password}</span>}
            {!errors.password && (
              <span className={styles.subtitle}>Мінімум 8 символів, щонайменше одна літера й одна цифра.</span>
            )}
          </label>

          <label className={styles.termsRow}>
            <input
              className={styles.termsCheckbox}
              type="checkbox"
              name="acceptTerms"
              checked={values.acceptTerms}
              onChange={updateField}
              aria-invalid={Boolean(errors.acceptTerms)}
            />
            <span className={styles.termsText}>
              Я погоджуюся з{' '}
              <Link className={styles.link} to={routes.offer()} target="_blank" rel="noreferrer">
                публічною офертою
              </Link>{' '}
              та{' '}
              <Link className={styles.link} to={routes.privacy()} target="_blank" rel="noreferrer">
                політикою конфіденційності
              </Link>
              .
            </span>
          </label>
          {errors.acceptTerms && <span className={styles.error}>{errors.acceptTerms}</span>}

          {formError && <p className={styles.formError}>{formError}</p>}

          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? 'Створюємо акаунт...' : 'Зареєструватися'}
          </button>
        </form>

        <p className={styles.footer}>
          Уже маєте акаунт?{' '}
          <Link className={styles.link} to={routes.login()}>
            Увійти
          </Link>
        </p>
      </div>
    </section>
  );
};

export default RegisterPage;

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, routes } from '@vexa/shared';

import { useAuth } from '../../context/auth-context.js';
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

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(mapIssues(parsed.error.issues));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await login(parsed.data);
      const destination = location.state?.from?.pathname ?? routes.home();
      navigate(destination, { replace: true });
    } catch (error) {
      const status = error.response?.status;
      const fieldErrors = apiFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);

      if (status === 429) {
        setFormError('Забагато спроб входу. Зачекайте трохи та спробуйте ще раз.');
      } else if (status === 401) {
        setFormError('Невірний email або пароль.');
      } else if (status === 403) {
        setFormError('Доступ до цього облікового запису обмежено.');
      } else if (Object.keys(fieldErrors).length === 0) {
        setFormError('Не вдалося увійти. Перевірте з’єднання та спробуйте ще раз.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Вхід</h1>
          <p className={styles.subtitle}>Увійдіть до свого простору Vexa.</p>
        </div>

        {location.state?.registered && (
          <p className={styles.success}>
            Реєстрація успішна. Перейдіть за посиланням підтвердження з листа, а потім увійдіть.
          </p>
        )}

        {location.state?.passwordReset && (
          <p className={styles.success}>
            Пароль успішно змінено. Тепер ви можете увійти з новим паролем.
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={styles.label}>Пароль</span>
              <Link 
                className={styles.link} 
                to={routes.forgotPassword()}
                style={{ fontSize: '13px', fontWeight: '400' }}
                onClick={(e) => e.stopPropagation()}
              >
                Забули пароль?
              </Link>
            </div>
            <input
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              type="password"
              name="password"
              autoComplete="current-password"
              value={values.password}
              onChange={updateField}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password && <span className={styles.error}>{errors.password}</span>}
          </label>

          {formError && <p className={styles.formError}>{formError}</p>}

          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? 'Входимо...' : 'Увійти'}
          </button>
        </form>

        <p className={styles.footer}>
          Ще немає акаунта?{' '}
          <Link className={styles.link} to={routes.register()}>
            Зареєструватися
          </Link>
        </p>
      </div>
    </section>
  );
};

export default LoginPage;
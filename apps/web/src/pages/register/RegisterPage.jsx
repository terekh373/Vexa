import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { registerSchema, routes } from '@vexa/shared';

import { useAuth } from '../../context/auth-context.js';
import { API } from '../../api/config.js';

import styles from './RegisterPage.module.css';

import registerImg from '../../assets/images/register.png';

import Icon01 from '../../assets/icons/login/i01.svg';
import Icon02 from '../../assets/icons/login/i02.svg';
import Icon03 from '../../assets/icons/login/i03.svg';
import Icon04 from '../../assets/icons/login/i04.svg';
import Icon05 from '../../assets/icons/login/i05.svg';
import Icon06 from '../../assets/icons/login/i06.svg';

const mapIssues = (issues) =>
  issues.reduce((result, issue) => {
    const field = issue.path?.[0] ?? 'form';

    if (!result[field]) result[field] = issue.message;

    return result;
  }, {});

const apiFieldErrors = (error) =>
  (error.response?.data?.error?.details ?? []).reduce(
    (result, detail) => {
      if (
        detail?.field &&
        detail?.message &&
        !result[detail.field]
      ) {
        result[detail.field] = detail.message;
      }

      return result;
    },
    {},
  );

const benefits = [
  {
    icon: Icon01,
    title: 'Доступ до курсів',
    text: '1200+ курсів на будь-який смак',
  },
  {
    icon: Icon02,
    title: 'Персональні рекомендації',
    text: 'Курси, які відповідають вашим цілям',
  },
  {
    icon: Icon03,
    title: 'Навчання у власному темпі',
    text: 'Переглядайте уроки, коли зручно',
  },
  {
    icon: Icon04,
    title: 'Підтримка викладачів',
    text: 'Отримуйте професійні поради',
  },
  {
    icon: Icon05,
    title: 'Відстеження прогресу',
    text: 'Контролюйте свої досягнення',
  },
  {
    icon: Icon06,
    title: 'Сертифікати після навчання',
    text: 'Підтверджуйте свої знання',
  },
];

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [goal, setGoal] = useState('student');

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

    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));

    setFormError('');
  };

  const startGoogleLogin = () => {
    sessionStorage.setItem('vexa.registrationGoal', goal);

    window.location.assign(
      `${API.replace(/\/$/, '')}/auth/google`,
    );
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
      navigate(routes.login(), {
        replace: true,
        state: {
          registered: true,
          ...(goal === 'author'
            ? { from: { pathname: routes.becomeAuthor() } }
            : {}),
        },
      });

      // navigate(routes.login(), {
      //   replace: true,
      //   state: {
      //     registered: true,
      //   },
      // });
    } catch (error) {
      const status = error.response?.status;
      const fieldErrors = apiFieldErrors(error);

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }

      if (status === 429) {
        setFormError(
          'Забагато спроб реєстрації. Зачекайте та спробуйте ще раз пізніше.',
        );
      } else if (status === 409) {
        setErrors((current) => ({
          ...current,
          email: 'Користувач із таким email уже існує.',
        }));
      } else if (Object.keys(fieldErrors).length === 0) {
        setFormError(
          'Не вдалося зареєструватися. Перевірте з’єднання та спробуйте ще раз.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        {/* LEFT CARD */}

        <div className={styles.welcomeCard}>
          <div className={styles.welcomeHeader}>
            <h1 className={styles.welcomeTitle}>
              Ласкаво просимо до <span>Vexa</span>
            </h1>

            <p className={styles.welcomeSubtitle}>
              Ваша освітня подорож починається тут
              <br />
              Зареєструйтесь та відкривайте доступ до тисяч
              курсів від найкращих викладачів
            </p>
          </div>

          <div className={styles.welcomeContent}>
            <div className={styles.benefits}>
              {benefits.map((benefit) => (
                <div
                  className={styles.benefit}
                  key={benefit.title}
                >
                  <img
                    className={styles.benefitIcon}
                    src={benefit.icon}
                    alt=""
                    aria-hidden="true"
                  />

                  <div className={styles.benefitContent}>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <img
              className={styles.welcomeImage}
              src={registerImg}
              alt="Vexa"
            />
          </div>
        </div>

        {/* RIGHT CARD */}

        <div className={styles.registerCard}>
          <h2 className={styles.registerTitle}>
            Створити акаунт
          </h2>
          <fieldset className={styles.goalSelector}>
            <legend className={styles.goalLegend}>
              Оберіть, ким ви хочете бути
            </legend>

            <div className={styles.goalOptions}>
              <label
                className={`${styles.goalOption} ${
                  goal === 'student' ? styles.goalActive : ''
                }`}
              >
                <input
                  type="radio"
                  name="registrationGoal"
                  value="student"
                  checked={goal === 'student'}
                  onChange={() => setGoal('student')}
                />
                <span>Хочу навчатися</span>
              </label>

              <label
                className={`${styles.goalOption} ${
                  goal === 'author' ? styles.goalActive : ''
                }`}
              >
                <input
                  type="radio"
                  name="registrationGoal"
                  value="author"
                  checked={goal === 'author'}
                  onChange={() => setGoal('author')}
                />
                <span>Хочу викладати</span>
              </label>
            </div>
          </fieldset>

          <button
            className={styles.googleButton}
            type="button"
            onClick={startGoogleLogin}
          >
            Увійти через Google
          </button>

          <div className={styles.divider}>
            <span>або</span>
          </div>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
          >
            {/* NAME */}

            <div className={styles.field}>
              <label
                className={styles.visuallyHidden}
                htmlFor="register-name"
              >
                Ім’я та прізвище
              </label>

              <input
                id="register-name"
                className={`${styles.input} ${
                  errors.fullName ? styles.inputError : ''
                }`}
                type="text"
                name="fullName"
                placeholder="Ім’я та прізвище"
                autoComplete="name"
                value={values.fullName}
                onChange={updateField}
                aria-invalid={Boolean(errors.fullName)}
              />

              {errors.fullName && (
                <span className={styles.error}>
                  {errors.fullName}
                </span>
              )}
            </div>

            {/* EMAIL */}

            <div className={styles.field}>
              <label
                className={styles.visuallyHidden}
                htmlFor="register-email"
              >
                Email
              </label>

              <input
                id="register-email"
                className={`${styles.input} ${
                  errors.email ? styles.inputError : ''
                }`}
                type="email"
                name="email"
                placeholder="Email"
                autoComplete="email"
                value={values.email}
                onChange={updateField}
                aria-invalid={Boolean(errors.email)}
              />

              {errors.email && (
                <span className={styles.error}>
                  {errors.email}
                </span>
              )}
            </div>

            {/* PASSWORD */}

            <div className={styles.field}>
              <label
                className={styles.visuallyHidden}
                htmlFor="register-password"
              >
                Пароль
              </label>

              <input
                id="register-password"
                className={`${styles.input} ${
                  errors.password ? styles.inputError : ''
                }`}
                type="password"
                name="password"
                placeholder="Створіть пароль"
                autoComplete="new-password"
                value={values.password}
                onChange={updateField}
                aria-invalid={Boolean(errors.password)}
              />

              {errors.password ? (
                <span className={styles.error}>
                  {errors.password}
                </span>
              ) : (
                <span className={styles.passwordHint}>
                  Мінімум 8 символів, щонайменше одна літера й
                  одна цифра.
                </span>
              )}
            </div>

            {/* TERMS */}

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
                <Link
                  className={styles.link}
                  to={routes.offer()}
                  target="_blank"
                  rel="noreferrer"
                >
                  публічною офертою
                </Link>{' '}
                та{' '}
                <Link
                  className={styles.link}
                  to={routes.privacy()}
                  target="_blank"
                  rel="noreferrer"
                >
                  політикою конфіденційності
                </Link>
                .
              </span>
            </label>

            {errors.acceptTerms && (
              <span className={styles.termsError}>
                {errors.acceptTerms}
              </span>
            )}

            {formError && (
              <p className={styles.formError}>
                {formError}
              </p>
            )}

            <button
              className={styles.submit}
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? 'Створюємо акаунт...'
                : 'Зареєструватися'}
            </button>
          </form>

          <div className={styles.registerFooter}>
            <span>Уже маєте акаунт?</span>

            <Link
              className={styles.loginLink}
              to={routes.login()}
            >
              Увійти
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegisterPage;
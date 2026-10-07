import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { verifyEmail } from '../../api/authApi.js';
import styles from '../auth/AuthForm.module.css';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Посилання підтвердження не містить токена.');

  useEffect(() => {
    if (!token) return;

    let active = true;

    verifyEmail(token)
      .then(() => {
        if (!active) return;
        setStatus('success');
        setMessage('Email успішно підтверджено. Тепер ви можете увійти.');
      })
      .catch((error) => {
        if (!active) return;
        setStatus('error');
        if (error.response?.status === 429) {
          setMessage('Забагато запитів. Зачекайте трохи та відкрийте посилання ще раз.');
        } else {
          setMessage('Не вдалося підтвердити email. Посилання могло бути недійсним або простроченим.');
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Підтвердження email</h1>
        </div>

        <div className={styles.statusBlock}>
          {status === 'loading' && <p className={styles.subtitle}>Перевіряємо посилання...</p>}
          {status === 'success' && <p className={styles.success}>{message}</p>}
          {status === 'error' && <p className={styles.formError}>{message}</p>}

          {status !== 'loading' && (
            <Link className={styles.link} to={routes.login()}>
              Перейти до входу
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default VerifyEmailPage;

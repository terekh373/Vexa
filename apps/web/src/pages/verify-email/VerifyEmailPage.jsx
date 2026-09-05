import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmailApi } from '../../api/authApi.js';
import { Container } from '../../components/layout/container/Container.jsx';
import styles from './VerifyEmailPage.module.css';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Токен підтвердження не знайдено.');
      return;
    }

    const verify = async () => {
      try {
        await verifyEmailApi(token);
        setStatus('success');
        setMessage('Ваш email успішно підтверджено! Тепер ви можете увійти в акаунт.');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Не вдалося підтвердити email. Можливо, посилання застаріло або вже було використане.');
      }
    };

    verify();
  }, [token]);

  return (
    <Container>
      <div className={styles.pageWrapper}>
        <div className={styles.card}>
          
          {status === 'loading' && (
            <>
              <div className={styles.loader}></div>
              <h2 className={styles.title}>Підтвердження...</h2>
              <p className={styles.text}>Будь ласка, зачекайте, ми перевіряємо ваші дані.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className={styles.iconSuccess}>✓</div>
              <h2 className={styles.title}>Успіх!</h2>
              <p className={styles.text}>{message}</p>
              <button className={styles.btn} onClick={() => navigate('/login')}>
                Перейти до входу
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className={styles.iconError}>✕</div>
              <h2 className={styles.title}>Помилка</h2>
              <p className={styles.text}>{message}</p>
              <button className={styles.btn} onClick={() => navigate('/register')}>
                На сторінку реєстрації
              </button>
            </>
          )}

        </div>
      </div>
    </Container>
  );
};

export default VerifyEmailPage;
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import apiClient from '../../api/client.js';
import { useAuth } from '../../context/auth-context.js';
import styles from '../auth/AuthForm.module.css';

const errorText = {
  access_denied: 'Вхід через Google було скасовано.',
  invalid_callback: 'Google повернув неповну відповідь. Спробуйте ще раз.',
  authorization_failed: 'Не вдалося підтвердити вхід через Google. Спробуйте ще раз.',
  account_blocked: 'Доступ до цього облікового запису обмежено.',
  account_conflict: 'Цей email уже пов’язаний з іншим Google-акаунтом.',
  not_configured: 'Вхід через Google тимчасово недоступний.',
  oauth_failed: 'Не вдалося завершити вхід через Google.',
};

const GoogleCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { applyAuthSession } = useAuth();
  const [message, setMessage] = useState('Завершуємо вхід через Google...');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const providerError = params.get('error');
    const code = params.get('code');

    if (providerError) {
      setFailed(true);
      setMessage(errorText[providerError] ?? errorText.oauth_failed);
      return;
    }
    if (!code) {
      setFailed(true);
      setMessage('Відсутній одноразовий код входу. Поверніться до сторінки входу.');
      return;
    }

    let cancelled = false;
    apiClient
      .post(
        '/auth/google/exchange',
        { code },
        { skipAuthRefresh: true, skipAuthHeader: true },
      )
      .then(({ data }) => {
        if (cancelled) return;
        applyAuthSession(data);
        navigate(routes.home(), { replace: true });
      })
      .catch((error) => {
        if (cancelled) return;
        setFailed(true);
        if (error.response?.status === 403) {
          setMessage('Доступ до цього облікового запису обмежено.');
        } else if (error.response?.status === 404) {
          setMessage('Код входу протермінований або вже використаний. Спробуйте увійти ще раз.');
        } else {
          setMessage('Не вдалося завершити вхід через Google. Спробуйте ще раз.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyAuthSession, navigate, params]);

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Вхід через Google</h1>
          <p className={failed ? styles.formError : styles.subtitle}>{message}</p>
        </div>
        {failed && (
          <Link className={styles.submit} to={routes.login()} style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
            Повернутися до входу
          </Link>
        )}
      </div>
    </section>
  );
};

export default GoogleCallbackPage;

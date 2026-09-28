import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { verifyEmail, resendVerificationEmail } from '../../api/authApi.js';
import styles from '../auth/AuthForm.module.css';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const calledRef = useRef(false);

  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Посилання підтвердження не містить токена.');
  
  const [emailInput, setEmailInput] = useState('');
  const [resendStatus, setResendStatus] = useState('idle');

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email успішно підтверджено. Тепер ви можете увійти.');
      })
      .catch((error) => {
        setStatus('error');
        if (error.response?.status === 429) {
          setMessage('Забагато запитів. Зачекайте трохи та відкрийте посилання ще раз.');
        } else {
          setMessage('Не вдалося підтвердити email. Посилання могло бути недійсним або простроченим.');
        }
      });
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendStatus('loading');
    
    try {
      await resendVerificationEmail(emailInput);
      setResendStatus('sent');
    } catch (err) {
      if (err.response?.status === 429) {
        setResendStatus('limit');
      } else {
        setResendStatus('error');
      }
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Підтвердження email</h1>
        </div>

        <div className={styles.statusBlock}>
          {status === 'loading' && <p className={styles.subtitle}>Перевіряємо посилання...</p>}
          {status === 'success' && <p className={styles.success}>{message}</p>}
          
          {status === 'error' && (
            <>
              <p className={styles.formError} style={{ marginBottom: '20px' }}>{message}</p>
              
              {resendStatus === 'sent' ? (
                <div style={{ padding: '12px', background: '#e6ffed', color: '#28a745', borderRadius: '6px', marginBottom: '16px' }}>
                  Новий лист успішно надіслано! Будь ласка, перевірте пошту.
                </div>
              ) : (
                <form onSubmit={handleResend} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Введіть свій email, щоб отримати нове посилання:</p>
                  <input 
                    type="email" 
                    placeholder="Введіть email..." 
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d9d9d9' }}
                  />
                  <button 
                    type="submit" 
                    disabled={resendStatus === 'loading'}
                    style={{ 
                      padding: '10px', 
                      background: resendStatus === 'loading' ? '#d9d9d9' : '#6236FF', 
                      color: resendStatus === 'loading' ? '#8c8c8c' : 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: resendStatus === 'loading' ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    {resendStatus === 'loading' ? 'Відправка...' : 'Надіслати лист ще раз'}
                  </button>
                  {resendStatus === 'limit' && <p className={styles.formError}>Забагато спроб. Зачекайте трохи.</p>}
                  {resendStatus === 'error' && <p className={styles.formError}>Помилка відправки. Спробуйте пізніше.</p>}
                </form>
              )}
            </>
          )}

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
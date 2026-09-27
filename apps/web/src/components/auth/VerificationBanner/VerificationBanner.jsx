import React, { useState } from 'react';
import { useAuth } from '../../../context/auth-context.js';
import { resendVerificationEmail } from '../../../api/authApi.js';
import styles from './VerificationBanner.module.css';

const VerificationBanner = ({ inline = false }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  if (!user || user.emailVerified) return null;

  const handleResend = async () => {
    setStatus('loading');
    setMessage('');
    
    try {
      await resendVerificationEmail(user.email);
      setStatus('sent');
      setMessage('Лист надіслано. Перевірте вашу поштову скриньку.');
    } catch (error) {
      const statusCode = error.response?.status;
      if (statusCode === 429) {
        setStatus('limit');
        setMessage('Забагато спроб. Зачекайте трохи перед наступною відправкою.');
      } else {
        setStatus('error');
        setMessage('Не вдалося надіслати лист. Спробуйте пізніше.');
      }
    }
  };

  return (
    <div className={`${styles.wrapper} ${inline ? styles.inline : styles.global}`}>
      <div className={styles.content}>
        <span className={styles.text}>
          ⚠️ Ваш email не підтверджено. Будь ласка, підтвердьте його для безпеки акаунта.
        </span>
        <button 
          className={styles.button}
          onClick={handleResend}
          disabled={status === 'loading' || status === 'sent' || status === 'limit'}
        >
          {status === 'loading' ? 'Відправка...' : 
           status === 'sent' ? 'Лист надіслано' : 
           'Надіслати лист ще раз'}
        </button>
      </div>
      {message && (
        <div className={`${styles.message} ${status === 'error' ? styles.msgError : styles.msgSuccess}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default VerificationBanner;
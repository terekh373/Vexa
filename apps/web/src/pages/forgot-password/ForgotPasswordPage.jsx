import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';
import { forgotPasswordRequest } from '../../api/userApi.js'; 
import styles from './ForgotPasswordPage.module.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await forgotPasswordRequest(email);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Помилка запиту на відновлення:', err);
      if (err?.response?.status === 429) {
        setError('Забагато спроб. Будь ласка, зачекайте трохи і спробуйте знову.');
      } else {
        setIsSubmitted(true); 
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Відновлення пароля</h1>
        
        {isSubmitted ? (
          <>
            <div className={styles.successMessage}>
              Якщо акаунт із такою адресою існує, ми надіслали на нього інструкції для відновлення пароля. 
              Будь ласка, перевірте свою пошту (і папку "Спам").
            </div>
            <Link to={routes.login()} className={styles.backLink}>
              Повернутися до входу
            </Link>
          </>
        ) : (
          <>
            <p className={styles.description}>
              Введіть електронну пошту, яку ви вказували при реєстрації, і ми надішлемо вам посилання для створення нового пароля.
            </p>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className={styles.label}>Електронна пошта</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ваш email"
                  className={styles.input}
                  required 
                />
              </div>
              
              {error && <div style={{ color: '#ff4d4f', fontSize: '13px' }}>{error}</div>}

              <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                {isLoading ? 'Надсилання...' : 'Надіслати посилання'}
              </button>
            </form>
            
            <Link to={routes.login()} className={styles.backLink}>
              ← Скасувати
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
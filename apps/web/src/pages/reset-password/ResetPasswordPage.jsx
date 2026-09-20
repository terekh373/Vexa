import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { routes } from '@vexa/shared';
import { resetPasswordRequest } from '../../api/userApi.js';
import styles from './ResetPasswordPage.module.css';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState('');
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('Токен відновлення не знайдено в посиланні.');
    }
  }, [location]);

  const handleChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setFieldError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setFieldError('Паролі не збігаються');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setFieldError('Пароль має містити щонайменше 8 символів');
      return;
    }

    setIsLoading(true);

    try {
      const response = await resetPasswordRequest(token, passwordData.newPassword);
      
      if (response.status === 204 || response.status === 200) {
        navigate(routes.login(), { state: { passwordReset: true } });
      }
    } catch (err) {
      console.error('Помилка скидання пароля:', err);
      const status = err?.response?.status;
      
      if (status === 404) {
        setError('Посилання недійсне або протерміноване.');
      } else if (status === 429) {
        setError('Забагато спроб. Зачекайте трохи і спробуйте знову.');
      } else if (status === 400) {
        setFieldError(err?.response?.data?.message || 'Некоректні дані');
      } else {
        setError('Сталася помилка при відновленні пароля. Спробуйте пізніше.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Створення нового пароля</h1>
        
        {error ? (
          <div className={styles.errorMessage}>
            {error}
            <br/>
            {(error.includes('Токен') || error.includes('протерміноване')) && (
              <Link to={routes.forgotPassword()} className={styles.actionLink}>
                Запитати нове посилання
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className={styles.description}>
              Придумайте новий надійний пароль для вашого акаунта.
            </p>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Новий пароль</label>
                <input 
                  type="password" 
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handleChange}
                  placeholder="Введіть новий пароль"
                  className={styles.input}
                  required 
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Підтвердіть пароль</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Повторіть пароль"
                  className={styles.input}
                  required 
                />
              </div>

              {fieldError && <div className={styles.fieldError}>{fieldError}</div>}

              <button type="submit" className={styles.submitBtn} disabled={isLoading || !token}>
                {isLoading ? 'Збереження...' : 'Зберегти новий пароль'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
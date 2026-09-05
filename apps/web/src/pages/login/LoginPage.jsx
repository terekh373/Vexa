import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import { Container } from '../../components/layout/container/Container.jsx';
import styles from './LoginPage.module.css';

import loginImg from '../../assets/images/auth01.jpg'; 

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const clearError = (field) => {
    if (errors[field] || errors.general) {
      setErrors((prev) => ({ ...prev, [field]: '', general: '' }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrors({});

    let newErrors = {};

    if (!email.trim()) newErrors.email = "Введіть email";
    if (!password) newErrors.password = "Введіть пароль";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    const result = await login(email, password);
    
    setIsLoading(false);
    
    if (result.success) {
      navigate('/profile');
    } else {
      if (result.details) {
        const serverErrors = {};
        result.details.forEach((err) => {
          serverErrors[err.field] = err.message;
        });
        setErrors(serverErrors);
      } else {
        setErrors({ general: result.error });
      }
    }
  };

  return (
    <Container>
      <div className={styles.pageWrapper}>
        
        <div className={styles.leftColumn}>
          <h1 className={styles.title}>Ласкаво просимо назад до <span className={styles.brand}>Vexa</span></h1>
          <p className={styles.subtitle}>Продовжуйте навчання, відкривайте нові можливості<br/>та розвивайте нові навички разом із нами</p>
          
          <div className={styles.contentRow}>
            <div className={styles.featuresList}>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>📚</span>
                <div>
                  <strong>Доступ до курсів</strong>
                  <p>Повертайтеся до придбаних курсів</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>⭐</span>
                <div>
                  <strong>Персональні рекомендації</strong>
                  <p>Продовжуйте навчання за планом</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>🎓</span>
                <div>
                  <strong>Навчання у власному темпі</strong>
                  <p>Навчайтесь, коли зручно</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>💬</span>
                <div>
                  <strong>Підтримка викладачів</strong>
                  <p>Отримайте своєчасні відповіді</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>📊</span>
                <div>
                  <strong>Відстеження прогресу</strong>
                  <p>Переглядайте свої результати</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>📄</span>
                <div>
                  <strong>Сертифікати після навчання</strong>
                  <p>Завантажуйте отримані сертифікати</p>
                </div>
              </div>
            </div>

            <div className={styles.imageWrapper}>
              <img src={loginImg} alt="Вхід" className={styles.heroImg} />
            </div>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <h2 className={styles.formTitle}>Вхід до акаунту</h2>
          
          {errors.general && <div className={styles.errorBox}>{errors.general}</div>}

          <form onSubmit={handleLogin} className={styles.form}>
            
            <div className={styles.inputGroup}>
              <input 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              />
              {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
            </div>

            <div className={styles.inputGroup}>
              <input 
                type="password" 
                placeholder="Ввести пароль" 
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              />
              {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
            </div>
            
            <div className={styles.formOptions}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} /> 
                <span>Запам'ятати мене</span>
              </label>
              <a href="#" className={styles.forgotPassword}>Забули пароль?</a>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? 'Вхід...' : 'Увійти'}
            </button>
          </form>

          <p className={styles.loginPrompt}>
            Ще не маєте акаунт? <Link to="/role-selection" className={styles.loginLink}>Зареєструватися</Link>
          </p>
        </div>

      </div>
    </Container>
  );
};

export default LoginPage;
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import { Container } from '../../components/layout/container/Container.jsx';
import styles from './RegisterPage.module.css';

import studentImg from '../../assets/images/auth02.jpg';
import teacherImg from '../../assets/images/auth04.jpg';

const RegisterPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const selectedRole = localStorage.getItem('vexa_selected_role') || 'студент';
  const displayImage = selectedRole === 'викладач' ? teacherImg : studentImg;

  const clearError = (field) => {
    if (errors[field] || errors.general) {
      setErrors((prev) => ({ ...prev, [field]: '', general: '' }));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    let newErrors = {};

    if (!firstName.trim()) newErrors.firstName = "Введіть ім'я";
    if (!lastName.trim()) newErrors.lastName = "Введіть прізвище";
    if (!email.trim()) newErrors.email = "Введіть email";

    const hasLetter = /[a-zA-Zа-яА-ЯіІїЇєЄґҐ]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!password) {
      newErrors.password = 'Створіть пароль';
    } else if (password.length < 8) {
      newErrors.password = 'Мінімум 8 символів';
    } else if (!hasLetter || !hasNumber) {
      newErrors.password = 'Пароль має містити щонайменше 1 літеру та 1 цифру';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Паролі не співпадають';
    }
    if (!agreed) {
      newErrors.general = 'Ви повинні погодитись з умовами використання';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    
    const result = await register(fullName, email, password, selectedRole);
    
    setIsLoading(false);
    
    if (result.success) {
      setSuccessMessage(result.message);

      setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setConfirmPassword('');
    } else {
      if (result.details) {
        const serverErrors = {};
        result.details.forEach((err) => {
          serverErrors[err.field] = err.message;
        });
        setErrors({ ...serverErrors, general: 'Будь ласка, виправте помилки у формі' });
      } else {
        setErrors({ general: result.error });
      }
    }
  };

  return (
    <Container>
      <div className={styles.pageWrapper}>
        <div className={styles.leftColumn}>
          <h1 className={styles.title}>Ласкаво просимо до <span className={styles.brand}>Vexa</span></h1>
          <p className={styles.subtitle}>Ваша освітня подорож починається тут<br/>Зареєструйтесь та відкривайте доступ до тисяч курсів від найкращих викладачів</p>
          
          <div className={styles.contentRow}>
            <div className={styles.featuresList}>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>📚</span>
                <div>
                  <strong>Доступ до курсів</strong>
                  <p>1200+ курсів на будь-який смак</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>⭐</span>
                <div>
                  <strong>Персональні рекомендації</strong>
                  <p>Курси, які відповідають вашим цілям</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>🎓</span>
                <div>
                  <strong>Навчання у власному темпі</strong>
                  <p>Переглядайте уроки, коли зручно</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>💬</span>
                <div>
                  <strong>Підтримка викладачів</strong>
                  <p>Отримуйте професійні поради</p>
                </div>
              </div>
            </div>

            <div className={styles.imageWrapper}>
              <img src={displayImage} alt={`Реєстрація - ${selectedRole}`} className={styles.heroImg} />
            </div>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>Створити акаунт</h2>
            
            {errors.general && <div className={styles.errorBox}>{errors.general}</div>}
            {successMessage && <div className={styles.successBox}>{successMessage}</div>}

            <form onSubmit={handleRegister} className={styles.form}>
              
              <div className={styles.inputGroup}>
                <input 
                  type="text" placeholder="Ім'я" value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); clearError('firstName'); clearError('fullName'); }}
                  className={`${styles.input} ${errors.firstName || errors.fullName ? styles.inputError : ''}`}
                />
                {errors.firstName && <span className={styles.fieldError}>{errors.firstName}</span>}
              </div>

              <div className={styles.inputGroup}>
                <input 
                  type="text" placeholder="Прізвище" value={lastName}
                  onChange={(e) => { setLastName(e.target.value); clearError('lastName'); clearError('fullName'); }}
                  className={`${styles.input} ${errors.lastName || errors.fullName ? styles.inputError : ''}`}
                />
                {errors.lastName && <span className={styles.fieldError}>{errors.lastName}</span>}
              </div>

              <div className={styles.inputGroup}>
                <input 
                  type="email" placeholder="Email" value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                />
                {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
              </div>

              <div className={styles.inputGroup}>
                <input 
                  type="password" placeholder="Створіть пароль" value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                />
                {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
              </div>

              <div className={styles.inputGroup}>
                <input 
                  type="password" placeholder="Підтвердіть ваш пароль" value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                  className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                />
                {errors.confirmPassword && <span className={styles.fieldError}>{errors.confirmPassword}</span>}
              </div>
              
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" className={styles.checkbox} checked={agreed}
                  onChange={(e) => { setAgreed(e.target.checked); clearError('general'); }}
                /> 
                <span>Я погоджуюсь з <a href="#">Умовами використання</a> та <a href="#">Політикою конфіденційності</a></span>
              </label>

              <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                {isLoading ? 'Реєстрація...' : 'Зареєструватися'}
              </button>
            </form>

            <p className={styles.loginPrompt}>
              Вже маєте акаунт? <Link to="/login" className={styles.loginLink}>Увійти</Link>
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default RegisterPage;
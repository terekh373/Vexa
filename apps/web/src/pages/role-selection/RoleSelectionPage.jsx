import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import { Container } from '../../components/layout/container/Container.jsx';
import styles from './RoleSelectionPage.module.css';

import studentImg from '../../assets/images/auth02.jpg';
import teacherImg from '../../assets/images/auth04.jpg';

const RoleSelectionPage = () => {
  const navigate = useNavigate();

  const handleSelectRole = (role) => {
    localStorage.setItem('vexa_selected_role', role);
    navigate('/register');
  };

  return (
    <Container>
      <div className={styles.pageWrapper}>
        
        <div className={styles.headerSection}>
          <p className={styles.topSubtitle}>Ласкаво просимо у Vexa</p>
          <h1 className={styles.title}>
            Оберіть, ким ви є <span className={styles.brand}>або хочете бути</span>
          </h1>
          <p className={styles.subtitle}>
            Це допоможе нам показати вам найактуальніший контент та можливості
          </p>
        </div>

        <div className={styles.cardsContainer}>
          
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <div className={styles.roleHeader}>
                <span className={styles.roleIcon}>🎓</span>
                <h3 className={styles.roleTitle}>Я студент</h3>
              </div>
              <p className={styles.roleSub}>Хочу навчатися та розвиватися</p>
              
              <p className={styles.roleDesc}>
                Знайдіть курси, які допоможуть здобути нові знання та навички в зручному форматі
              </p>

              <ul className={styles.featuresList}>
                <li>✓ Доступ до 1200+ курсів</li>
                <li>✓ Відстеження прогресу</li>
                <li>✓ Сертифікати після завершення</li>
                <li>✓ Персональні рекомендації</li>
              </ul>

              <button 
                className={styles.selectBtn} 
                onClick={() => handleSelectRole('студент')}
              >
                Обрати роль студента
              </button>
            </div>

            <div className={styles.imageWrapper}>
              <img src={studentImg} alt="Студент" className={styles.roleImg} />
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.imageWrapper}>
              <img src={teacherImg} alt="Викладач" className={styles.roleImg} />
            </div>

            <div className={styles.cardContent}>
              <div className={styles.roleHeader}>
                <span className={styles.roleIcon}>👨‍🏫</span>
                <h3 className={styles.roleTitle}>Я викладач</h3>
              </div>
              <p className={styles.roleSub}>Хочу ділитися знаннями та надихати</p>
              
              <p className={styles.roleDesc}>
                Створюйте курси, діліться знаннями та заробляйте, допомагаючи іншим
              </p>

              <ul className={styles.featuresList}>
                <li>✓ Створення та публікація курсів</li>
                <li>✓ Аналітика та статистика</li>
                <li>✓ Гнучке керування контентом</li>
                <li>✓ Підтримка та спільнота</li>
              </ul>

              <button 
                className={styles.selectBtn} 
                onClick={() => handleSelectRole('викладач')}
              >
                Обрати роль викладача
              </button>
            </div>
          </div>

        </div>

        <div className={styles.footerNote}>
          <span>🛡️</span>
          <p>Ви завжди можете змінити роль у будь-який момент</p>
          <span className={styles.footerSubNote}>Налаштування доступу й рекомендацій оновляться автоматично</span>
        </div>

      </div>
    </Container>
  );
};

export default RoleSelectionPage;
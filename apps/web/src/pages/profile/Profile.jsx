import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import { Container } from '../../components/layout/container/Container.jsx';
import styles from './Profile.module.css';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  const weekDays = [
    { day: 'Пн', date: '5 жовтня' },
    { day: 'Вт', date: '6 жовтня' },
    { day: 'Ср', date: '7 жовтня' },
    { day: 'Чт', date: '8 жовтня' },
    { day: 'Пт', date: '9 жовтня' },
    { day: 'Сб', date: '10 жовтня' },
    { day: 'Нд', date: '11 жовтня' },
  ];

  return (
    <Container>
      <div className={styles.dashboardWrapper}>
        
        <div className={styles.welcomeSection}>
          <h1 className={styles.welcomeTitle}>Привіт, {user.name}!</h1>
          <p className={styles.welcomeSubtitle}>Готова продовжити навчання?</p>
        </div>

        <div className={styles.gridContainer}>
          
          <div className={styles.leftColumn}>
            <div className={styles.profileCard}>
              <div className={styles.photoBox}>фото</div>
              <div className={styles.infoBox}>{user.name}</div>
              <div className={styles.infoBox}>{user.role}</div>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                Вийти з акаунта
              </button>
            </div>

            <div className={styles.coursesCard}>
              <h3 className={styles.sectionTitle}>Мої курси</h3>
              <div className={styles.emptyCourses}>
                <span>Немає курсів</span>
              </div>
            </div>
          </div>

          <div className={styles.rightColumn}>
            
            <div className={styles.calendarCard}>
              <div className={styles.calendarHeader}>
                <h3>Календар на тиждень</h3>
                <span className={styles.calendarNav}>‹ 5-11 жовтня ›</span>
              </div>
              <div className={styles.daysGrid}>
                {weekDays.map((item, index) => (
                  <div key={index} className={styles.dayCell}>
                    <div className={styles.dayName}>{item.day}</div>
                    <div className={styles.dayDate}>{item.date}</div>
                    <div className={styles.daySubject}>немає</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.bottomRow}>
              <div className={styles.tasksCard}>
                <h3 className={styles.sectionTitle}>Маршрут на сьогодні</h3>
                <div className={styles.emptyBox}>
                  <span>На сьогодні немає активних завдань</span>
                </div>
              </div>

              <div className={styles.tasksCard}>
                <h3 className={styles.sectionTitle}>Завдання на тиждень</h3>
                <div className={styles.emptyBox}>
                  <span>Немає завдань на цей тиждень</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </Container>
  );
};

export default Profile;
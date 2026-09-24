import React, { useState, useEffect, useMemo } from 'react';
import styles from './Profile.module.css';
import { useNavigate } from 'react-router-dom';
import { routePatterns } from '@vexa/shared';
import { useAuth } from '../../context/auth-context.js'; 

const defaultCourses = [
  {
    id: 101,
    title: 'UX/UI дизайн з нуля',
    module: 'Модуль 3. Прототипування',
    progress: 74,
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=500&auto=format&fit=crop&q=60',
  },
  {
    id: 102,
    title: 'Математика для 10 класу',
    module: 'Розділ 5. Квадратні рівняння',
    progress: 62,
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60',
  },
  {
    id: 103,
    title: 'Англійська мова B2',
    module: 'Unit 7. Travel and Tourism',
    progress: 48,
    image: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=500&auto=format&fit=crop&q=60',
  }
];

const scheduleMap = {
  'Пн': '10:00 UX/UI',
  'Вт': '14:00 Англ B2',
  'Ср': '16:30 Матем',
  'Чт': '14:00 Англ B2',
  'Пт': '16:30 Матем',
  'Сб': '12:30 UX/UI',
  'Нд': 'Вихідний'
};

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); 
  
  const [courses, setCourses] = useState([]);
  const [avatar, setAvatar] = useState(null); 

  const firstName = user?.fullName || 'Ніколь';
  const initials = firstName.substring(0, 2).toUpperCase();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('my_courses') || '[]');
    const isInitialized = localStorage.getItem('courses_initialized');

    if (!isInitialized) {
      localStorage.setItem('my_courses', JSON.stringify(defaultCourses));
      localStorage.setItem('courses_initialized', 'true');
      setCourses(defaultCourses);
    } else {
      setCourses(saved);
    }
  }, []);

  const { weekDays, calendarRange } = useMemo(() => {
    const curr = new Date();
    const dayOfWeek = curr.getDay() === 0 ? 7 : curr.getDay(); 
    const first = curr.getDate() - dayOfWeek + 1;
    const days = [];
    const dayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
    
    let startDay = '', endDay = '', currentMonth = '';

    for (let i = 0; i < 7; i++) {
      const next = new Date(curr.getFullYear(), curr.getMonth(), first + i);
      const dayStr = dayNames[next.getDay()];
      
      if (i === 0) startDay = next.getDate();
      if (i === 6) {
        endDay = next.getDate();
        currentMonth = months[next.getMonth()];
      }

      const hasCourses = courses.length > 0;
      let slotText = hasCourses ? scheduleMap[dayStr] : '';
      if (dayStr === 'Нд') slotText = 'Вихідний';

      days.push({
        day: dayStr,
        num: `${next.getDate()} ${months[next.getMonth()]}`,
        isToday: next.toDateString() === curr.toDateString(),
        slot: slotText
      });
    }
    return { weekDays: days, calendarRange: `< ${startDay}-${endDay} ${currentMonth} >` };
  }, [courses]);

  const handleRemoveCourse = (courseId) => {
    if (window.confirm('Ви впевнені, що хочете відмовитися від цього курсу?')) {
      const updatedCourses = courses.filter(c => c.id !== courseId);
      setCourses(updatedCourses);
      localStorage.setItem('my_courses', JSON.stringify(updatedCourses));
    }
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(URL.createObjectURL(e.target.files[0]));
    }
  };

  const mainCourse = courses.length > 0 ? courses[0] : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.userInfo}>
            <div className={styles.avatarWrapper}>
              <img 
                src={avatar || `https://ui-avatars.com/api/?name=${initials}&background=6236FF&color=fff&size=120`} 
                alt="Аватар" 
                className={styles.avatar} 
              />
              <label className={styles.uploadBtn} title="Завантажити нове фото">
                <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                📷
              </label>
            </div>
            <div>
              <h1>Привіт, {firstName}!</h1>
              <p>Готові продовжити навчання?</p>
            </div>
          </div>
          
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          
          {mainCourse ? (
            <div className={styles.heroCard}>
              <div className={styles.heroTop}>
                <span className={styles.heroTitle}>{mainCourse.title}</span>
                <span className={styles.heroBadge}>Сьогодні, 16:30 • 90 хв</span>
              </div>
              <div className={styles.heroBottom}>
                <div className={styles.heroInfo}>
                  <div className={styles.teacherBox}>
                    <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80" alt="Викладач" />
                    <div>
                      <span className={styles.lightText}>Викладач:</span>
                      <strong>Марія Коваль</strong>
                      <span className={styles.lightText}>Senior UX/UI • ★ 4.6</span>
                    </div>
                  </div>
                  <div className={styles.progressBox}>
                    <div className={styles.progressLabels}>
                      <span>Твій прогрес</span>
                      <span className={styles.percentText}>{mainCourse.progress}%</span>
                    </div>
                    <div className={styles.track}>
                      <div className={styles.bar} style={{ width: `${mainCourse.progress}%` }}></div>
                    </div>
                    <span className={styles.lightText}>{mainCourse.module}</span>
                  </div>
                  <div className={styles.heroActions}>
                    <button className={styles.btnContinue}>Продовжити навчання →</button>
                    <button className={styles.btnRemoveMain} onClick={() => handleRemoveCourse(mainCourse.id)}>
                      Відмовитися від курсу
                    </button>
                  </div>
                </div>
                <div className={styles.heroImgBox}>
                  <img src={mainCourse.image} alt="Процес" />
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyHeroCard}>
              <h3>У вас поки немає активних курсів 😔</h3>
              <p>Розклад пустий. Перейдіть до каталогу, щоб знайти щось цікаве для себе!</p>
              <button className={styles.btnPrimary} onClick={() => navigate(routePatterns.catalog)}>
                Перейти в каталог
              </button>
            </div>
          )}

          <div className={styles.card}>
            <div className={styles.cardTop}>
              <h3>Мої курси</h3>
              <span className={styles.link} onClick={() => navigate(routePatterns.catalog)}>Перейти до всіх курсів →</span>
            </div>
            <div className={styles.coursesList}>
              {courses.length > 0 ? courses.map(course => (
                <div key={course.id} className={styles.courseItem}>
                  <div className={styles.imgWrapper}>
                    <img src={course.image} alt={course.title} />
                    <button 
                      className={styles.removeBtn} 
                      onClick={() => handleRemoveCourse(course.id)}
                      title="Відписатися від курсу"
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.courseText}>
                    <h4>{course.title}</h4>
                    <p>{course.module}</p>
                    <div className={styles.miniTrack}>
                      <div className={styles.miniBar} style={{ width: `${course.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              )) : (
                <p className={styles.emptyText}>Ви ще не обрали жодного курсу.</p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.card}>
            <div className={styles.cardTop}>
              <h3>Календар на тиждень</h3>
              <span className={styles.link}>{calendarRange}</span>
            </div>
            <div className={styles.calGrid}>
              {weekDays.map((d, i) => (
                <div key={i} className={`${styles.calDay} ${d.isToday ? styles.today : ''}`}>
                  <strong>{d.day}</strong>
                  <span>{d.num}</span>
                  {d.slot && <div className={styles.calSlot}>{d.slot}</div>}
                </div>
              ))}
            </div>
            <div className={styles.cardBottomLink}>
              <span className={styles.link}>Переглянути весь розклад →</span>
            </div>
          </div>

          <div className={styles.bottomSplit}>
            <div className={styles.card}>
              <div className={styles.cardTop}>
                <h3>Маршрут на сьогодні</h3>
              </div>
              <div className={styles.taskList}>
                <div className={styles.taskItem}>
                  <div className={styles.checkDone}>✓</div>
                  <div>
                    <strong>Ранкове повторення</strong>
                    <p>Виконано • 5 хв</p>
                  </div>
                </div>
                {courses.length > 0 && (
                  <div className={styles.taskItem}>
                    <div className={styles.timeTag}>10:00</div>
                    <div className={styles.joinFlex}>
                      <div>
                        <strong>{courses[0].title.substring(0, 15)}...</strong>
                        <p>Онлайн • 90 хв</p>
                      </div>
                      <button className={styles.joinBtn}>Приєднатися</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTop}>
                <h3>Завдання на тиждень</h3>
                <span className={styles.metaCount}>2 з 5</span>
              </div>
              <div className={styles.taskList}>
                <label className={styles.checkRow}>
                  <input type="checkbox" defaultChecked />
                  <div>
                    <strong>Здати прототип</strong>
                    <p>Сьогодні, 18:00</p>
                  </div>
                </label>
                <label className={styles.checkRow}>
                  <input type="checkbox" defaultChecked />
                  <div>
                    <strong>Тест з англійської</strong>
                    <p>Завтра, 12:00</p>
                  </div>
                </label>
                <label className={styles.checkRow}>
                  <input type="checkbox" />
                  <div>
                    <strong>Розв'язати задачі</strong>
                    <p>22 вересня</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
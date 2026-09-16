import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Settings.module.css';
import { AuthContext } from '../../context/AuthContext.jsx';

const Settings = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('notifications');

  const [toggles, setToggles] = useState({
    reminders: true,
    messages: true,
    results: true,
    recommendations: false,
    twoFactor: true
  });

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        
        <button className={styles.backBtn} onClick={() => navigate('/profile')}>
          ← Назад до кабінету
        </button>

        <div className={styles.layout}>
          
          <div className={styles.leftCol}>
            <h1 className={styles.title}>Налаштування</h1>
            <p className={styles.subtitle}>Керуй параметрами свого акаунта</p>
            <div className={styles.imgWrapper}>
              <img 
                src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=400&q=80" 
                alt="Settings illustration" 
                className={styles.illustration}
              />
            </div>
          </div>

          <div className={styles.navCol}>
            <ul className={styles.navList}>
              <li className={activeTab === 'general' ? styles.activeItem : styles.navItem} onClick={() => setActiveTab('general')}>
                <span className={styles.icon}>⚙️</span> Загальні
              </li>
              <li className={activeTab === 'notifications' ? styles.activeItem : styles.navItem} onClick={() => setActiveTab('notifications')}>
                <span className={styles.icon}>🔔</span> Сповіщення
              </li>
              <li className={activeTab === 'security' ? styles.activeItem : styles.navItem} onClick={() => setActiveTab('security')}>
                <span className={styles.icon}>🛡️</span> Безпека
              </li>
              <li className={activeTab === 'privacy' ? styles.activeItem : styles.navItem} onClick={() => setActiveTab('privacy')}>
                <span className={styles.icon}>👤</span> Приватність
              </li>
            </ul>
          </div>

          <div className={styles.contentCol}>
            <div className={styles.settingsCard}>
              
              <h2 className={styles.sectionTitle}>Сповіщення</h2>
              <p className={styles.sectionDesc}>Оберіть, які повідомлення ви хочете отримувати</p>

              <div className={styles.optionList}>
                <div className={styles.optionRow}>
                  <div>
                    <strong>Нагадування про заняття</strong>
                    <p>За 30 хвилин до початку уроку</p>
                  </div>
                  <div className={`${styles.toggle} ${toggles.reminders ? styles.toggleOn : ''}`} onClick={() => handleToggle('reminders')}>
                    <div className={styles.toggleKnob}></div>
                  </div>
                </div>

                <div className={styles.optionRow}>
                  <div>
                    <strong>Нові повідомлення</strong>
                    <p>Повідомлення від викладачів і підтримки</p>
                  </div>
                  <div className={`${styles.toggle} ${toggles.messages ? styles.toggleOn : ''}`} onClick={() => handleToggle('messages')}>
                    <div className={styles.toggleKnob}></div>
                  </div>
                </div>

                <div className={styles.optionRow}>
                  <div>
                    <strong>Результати перевірки</strong>
                    <p>Коли викладач перевірить знання</p>
                  </div>
                  <div className={`${styles.toggle} ${toggles.results ? styles.toggleOn : ''}`} onClick={() => handleToggle('results')}>
                    <div className={styles.toggleKnob}></div>
                  </div>
                </div>

                <div className={styles.optionRow}>
                  <div>
                    <strong>Рекомендації курсів</strong>
                    <p>Персональні добірки нових курсів</p>
                  </div>
                  <div className={`${styles.toggle} ${toggles.recommendations ? styles.toggleOn : ''}`} onClick={() => handleToggle('recommendations')}>
                    <div className={styles.toggleKnob}></div>
                  </div>
                </div>
              </div>

              <h2 className={styles.sectionTitle} style={{ marginTop: '40px' }}>Безпека</h2>

              <div className={styles.optionList}>
                <div className={styles.optionRow}>
                  <div>
                    <strong>Пароль</strong>
                    <p>Змінюйте пароль для захисту акаунта</p>
                  </div>
                  <button className={styles.changePasswordBtn}>Змінити пароль</button>
                </div>

                <div className={styles.optionRow}>
                  <div>
                    <strong>Двофактурна автентифікація</strong>
                    <p>Додатковий рівень захисту вашого акаунта</p>
                  </div>
                  <div className={`${styles.toggle} ${toggles.twoFactor ? styles.toggleOn : ''}`} onClick={() => handleToggle('twoFactor')}>
                    <div className={styles.toggleKnob}></div>
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button className={styles.cancelBtn} onClick={() => navigate('/profile')}>Скасувати</button>
                <button className={styles.saveBtn}>Зберегти зміни</button>
              </div>

              <div className={styles.dangerZone}>
                <button 
                  onClick={() => { logout(); navigate('/login'); }}
                  style={{ marginBottom: '24px', padding: '12px 24px', background: '#fff', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Вийти з акаунту
                </button>
                <br/>
                <strong className={styles.dangerTitle}>Видалити акаунт</strong>
                <p>🗑️ Цю дію неможливо скасувати. Усі ваші дані будуть видалені назавжди</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
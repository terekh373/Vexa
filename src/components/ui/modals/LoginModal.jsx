import React from 'react';
import styles from './LoginModal.module.css';
import heroImage from "../../../assets/images/img02.png"; 

const LoginModal = ({ onClose }) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        
        <div className={styles.leftCard}>
          <div className={styles.leftHeader}>
            <button className={styles.teacherBtn}>Увійти, як викладач</button>
          </div>
          
          <div className={styles.leftContent}>
            <div className={styles.textSection}>
              <h1 className={styles.mainTitle}>
                Вхід у<br />ваш<br />акаунт
              </h1>
              <p className={styles.description}>
                Навчайтеся, розвивайтеся, досягайте більшого разом із Vexa
              </p>
            </div>
            
            <div className={styles.imageSection}>
              <img src={heroImage} alt="Студент" className={styles.heroImg} />
            </div>
          </div>

          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <span className={styles.statIcon}>👥</span>
              <div className={styles.statText}>
                <strong>10000+</strong>
                <span>студентів</span>
              </div>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statIcon}>⭐</span>
              <div className={styles.statText}>
                <strong>500+</strong>
                <span>курсів</span>
              </div>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statIcon}>🏆</span>
              <div className={styles.statText}>
                <span>Твій розвиток</span>
                <span>починається тут</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.rightCard}>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>

          <h2 className={styles.title}>Ради вас бачити знову!</h2>
          <p className={styles.subtitle}>Увійдіть, щоб продовжити навчання</p>

          <form className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Електронна пошта</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>✉️</span>
                <input type="email" placeholder="Введіть вашу пошту" />
                <span className={styles.inputActionIcon}>👁️‍🗨️</span>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Пароль</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>🔒</span>
                <input type="password" placeholder="Введіть пароль" />
                <span className={styles.inputActionIcon}>👁️‍🗨️</span>
              </div>
            </div>

            <div className={styles.options}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" />
                <span className={styles.fakeCheckbox}></span>
                <span>Запам'ятати мене</span>
              </label>
              <a href="#" className={styles.forgotBtn}>Забули пароль?</a>
            </div>

            <button type="button" className={styles.submitBtn}>
              Увійти
            </button>
          </form>

          <div className={styles.divider}>
            <span>або продовжити з</span>
          </div>

          <div className={styles.socials}>
            <button className={styles.socialIcon}>f</button>
            <button className={styles.socialIcon}>ig</button>
            <button className={styles.socialIcon}>tt</button>
            <button className={styles.socialIcon}>tg</button>
          </div>

          <div className={styles.footer}>
            <button className={styles.noAccountBtn}>Немає акаунту?</button>
            <button className={styles.registerBtn}>Зареєструватися</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginModal;
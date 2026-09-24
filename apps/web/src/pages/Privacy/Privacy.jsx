import React from 'react';
import styles from './Privacy.module.css';

const Privacy = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Політика конфіденційності</h1>
      <div className={styles.section}>
        <h2>1. Збір та обробка даних</h2>
        <p>Обробка персональних даних користувачів здійснюється відповідно до Закону України «Про захист персональних даних».</p>
      </div>
      <div className={styles.section}>
        <h2>2. Видалення акаунта</h2>
        <p>Ви маєте право у будь-який момент надіслати запит на повне видалення вашого акаунта та всіх пов'язаних персональних даних. Для цього створіть відповідне звернення на сторінці Підтримки.</p>
      </div>
    </div>
  );
};

export default Privacy;
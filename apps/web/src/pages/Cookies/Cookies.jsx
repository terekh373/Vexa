import React from 'react';
import styles from './Cookies.module.css';

const Cookies = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Політика використання cookie</h1>
      <div className={styles.section}>
        <h2>Що таке файли cookie?</h2>
        <p>Це невеликі текстові файли, які зберігаються на вашому пристрої для забезпечення коректної роботи платформи (наприклад, збереження сесії авторизації).</p>
      </div>
      <div className={styles.section}>
        <h2>Керування cookie</h2>
        <p>Ви можете вимкнути використання файлів cookie у налаштуваннях вашого браузера, однак це може призвести до некоректної роботи деяких функцій платформи.</p>
      </div>
    </div>
  );
};

export default Cookies;
import React from 'react';
import styles from './Offer.module.css';

const Offer = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Публічна оферта</h1>
      <div className={styles.section}>
        <h2>1. Загальні положення</h2>
        <p>Ця оферта є офіційною пропозицією платформи Vexa. Увага: наразі платформа працює в режимі бета-тестування оплат (тестовий режим).</p>
      </div>
      <div className={styles.section}>
        <h2>2. Фінансові умови для авторів</h2>
        <ul>
          <li>Комісія платформи за розміщення та продаж курсів становить <strong>15%</strong> від вартості курсу.</li>
          <li>Мінімальна сума для виведення коштів авторами становить <strong>500 грн</strong>.</li>
        </ul>
      </div>
      <div className={styles.section}>
        <h2>3. Політика повернення коштів</h2>
        <p>Студент має право на повернення коштів протягом <strong>14 днів</strong> з моменту покупки курсу за умови, що:</p>
        <ul>
          <li>Пройдено менше 20% матеріалів курсу.</li>
          <li>Навчальні матеріали (PDF, відео, архіви) не були завантажені на пристрій користувача.</li>
        </ul>
      </div>
    </div>
  );
};

export default Offer;
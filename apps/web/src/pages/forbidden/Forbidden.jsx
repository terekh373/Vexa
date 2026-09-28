import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

import styles from './Forbidden.module.css';

const Forbidden = () => (
  <main className={styles.page}>
    <div className={styles.card}>
      <span className={styles.code}>403</span>
      <h1>Доступ заборонено</h1>
      <p>У вашого акаунта немає прав для перегляду цієї сторінки.</p>
      <Link className={styles.link} to={routes.home()}>
        На головну
      </Link>
    </div>
  </main>
);

export default Forbidden;

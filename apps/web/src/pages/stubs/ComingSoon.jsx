import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Button from '../../components/ui/buttons/Button.jsx';

import styles from './ComingSoon.module.css';

const ComingSoon = () => {
  const navigate = useNavigate();

  const goHome = () => {
    navigate(routes.home());
  };

  const goCatalog = () => {
    navigate(routes.catalog());
  };

  return (
    <main className={styles.page}>
      <Container>
        <div className={styles.wrapper}>
          <div className={styles.visual}>
            <div className={styles.glow}></div>

            <div className={styles.orbit}>
              <div className={`${styles.dot} ${styles.dotOne}`}></div>
              <div className={`${styles.dot} ${styles.dotTwo}`}></div>
              <div className={`${styles.dot} ${styles.dotThree}`}></div>
            </div>

            <div className={`${styles.floatingCard} ${styles.cardOne}`}>
              <span>01</span>
              <div>
                <i></i>
                <i></i>
              </div>
            </div>

            <div className={`${styles.floatingCard} ${styles.cardTwo}`}>
              <div className={styles.play}></div>
            </div>

            <div className={`${styles.floatingCard} ${styles.cardThree}`}>
              <span>✓</span>
            </div>

            <div className={styles.logoCard}>
              <div className={styles.logoMark}>V</div>
              <span>VEXA</span>
              <small>loading...</small>

              <div className={styles.loader}>
                <span></span>
              </div>
            </div>
          </div>

          <div className={styles.content}>
            <span className={styles.badge}>
              Скоро буде
            </span>

            <h1>
              Ця сторінка вже
              <span> в роботі</span>
            </h1>

            <p>
              Ми працюємо над цією частиною VEXA, щоб зробити її
              зручною та корисною. А поки можете переглянути доступні
              курси або повернутися на головну.
            </p>

            <div className={styles.buttons}>
              <Button
                title="Перейти до курсів"
                variant="primary"
                size="medium"
                onClick={goCatalog}
              />

              <Button
                title="На головну"
                variant="secondary"
                size="medium"
                onClick={goHome}
              />
            </div>
          </div>
        </div>
      </Container>
    </main>
  )
};

export default ComingSoon;
import styles from './NotFound.module.css';
import notFoundImg from '../../assets/images/404.png';
import Button from '../../components/ui/buttons/Button';
import { useNavigate } from 'react-router-dom';
import { routePatterns } from '@vexa/shared';

const NotFound = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate(routePatterns.home);
  }

  const handleGoCatalog = () => {
    navigate(routePatterns.catalog);
  }

  return (
    <section className={styles.container}>

      <img src={notFoundImg} alt='Page not found' className={styles.img} />
      <div className={styles.info}>
        <h3>Ой! Сторінку не знайдено</h3>
        <p>Схоже, ця сторінка вирушила у відкритий космос.</p>
        <p>Але не хвилюйся, у нас ще багато цікавого.</p>

        <div className={styles.bttnBox}>
          <Button title='Повернутися на головну' variant='primary' size='medium' onClick={handleGoHome} />
          <Button title='Перейти до каталогу курсів' variant='link' size='zero' onClick={handleGoCatalog} />
        </div>
      </div>
    </section>
  )
};

export default NotFound;
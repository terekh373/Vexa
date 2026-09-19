import styles from './Footer.module.css';
import { Link } from 'react-router-dom';
import { Container } from '../container/Container';
import facebook from '../../../assets/socialmedia/fb.svg';
import instagram from '../../../assets/socialmedia/inst.svg';
import tiktok from '../../../assets/socialmedia/tt.svg';
import telegram from '../../../assets/socialmedia/tg.svg';

import { Logo } from '../../ui/logo/Logo.jsx'

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.container}>

          <div className={styles.about}>
            <Logo />

            <p className={styles.description}>
              Платформа онлайн-курсів для тих, хто хоче розвиватися та досягати більшого.
            </p>
          </div>

          <div className={styles.column}>
            <h4>Платформа</h4>

            <Link to="/courses">Каталог курсів</Link>
            <Link to="/authors">Автори</Link>
            <Link to="/ai">Vexa AI</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/veterans">Для ветеранів</Link>
            <Link to="/blog">Блог</Link>
          </div>

          <div className={styles.column}>
            <h4>Компанія</h4>

            <Link to="/about">Про нас</Link>
            <Link to="/contacts">Контакти</Link>
            <Link to="/career">Кар’єра</Link>
            <Link to="/vacancies">Вакансії</Link>
            <Link to="/press">Прес-центр</Link>
          </div>

          <div className={styles.column}>
            <h4>Підтримка</h4>

            <Link to="/help">Допомога</Link>
            <Link to="/terms">Умови використання</Link>
            <Link to="/privacy">Політика конфіденційності</Link>
            <Link to="/refund">Повернення коштів</Link>
          </div>

          <div className={styles.column}>
            <h4>Співпраця</h4>

            <Link to="/become-author">Стати автором</Link>
            <Link to="/partners">Для партнерів</Link>
            <Link to="/brands">Для брендів</Link>
          </div>

          <div className={styles.column}>
            <h4>Бренди</h4>

            <Link to="/advertising">Рекламні можливості</Link>
            <Link to="/projects">Спільні проєкти</Link>
          </div>
        </div>

        <div className={styles.subfooter}>
          <div className={styles.row}>
            <Link to="/facebook"><img src={facebook} alt="" aria-hidden="true" /></Link>
            <Link to="/instagram"><img src={instagram} alt="" aria-hidden="true" /></Link>
            <Link to="/tiktok"><img src={tiktok} alt="" aria-hidden="true" /></Link>
            <Link to="/telegram"><img src={telegram} alt="" aria-hidden="true" /></Link>
          </div>

          <div className={styles.copyright}>
            © 2026 Vexa. Усі права захищені
          </div>
        </div>

      </Container>
    </footer>
  );
};

export default Footer;
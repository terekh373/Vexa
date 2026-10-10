import { useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

import styles from './Footer.module.css';

import { Container } from '../container/Container';
import { Logo } from '../../ui/logo/Logo.jsx';

import facebook from '../../../assets/socialmedia/fb.svg';
import instagram from '../../../assets/socialmedia/inst.svg';
import tiktok from '../../../assets/socialmedia/tt.svg';
import telegram from '../../../assets/socialmedia/tg.svg';

const footerColumns = [
  {
    id: 'platform',
    title: 'Платформа',
    links: [
      { to: routes.catalog(), label: 'Каталог курсів' },
      { to: routes.forAuthors(), label: 'Для авторів' },
      { to: '/faq?role=student', label: 'FAQ для покупців' },
    ],
  },
  {
    id: 'company',
    title: 'Компанія',
    links: [
      { to: routes.about(), label: 'Про нас' },
      { to: routes.contacts(), label: 'Контакти' },
    ],
  },
  {
    id: 'support',
    title: 'Підтримка та Документи',
    links: [
      { to: routes.support(), label: 'Підтримка' },
      { to: routes.offer(), label: 'Публічна оферта' },
      { to: routes.privacy(), label: 'Політика конфіденційності' },
      { to: routes.cookies(), label: 'Політика cookie' },
      { to: routes.contentRules(), label: 'Правила розміщення контенту' },
    ],
  },
  {
    id: 'cooperation',
    title: 'Співпраця',
    links: [
      { to: routes.becomeAuthor(), label: 'Стати автором' },
      { to: '/faq?role=author', label: 'FAQ для авторів' },
    ],
  },
];

const Footer = () => {
  const [openColumn, setOpenColumn] = useState('platform');

  const handleColumnClick = (id) => {
    setOpenColumn((current) => (current === id ? null : id));
  };

  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.container}>
          <div className={styles.about}>
            <Logo />

            <p className={styles.description}>
              Платформа онлайн-курсів для тих, хто хоче розвиватися та
              досягати більшого.
            </p>
          </div>

          <div className={styles.columns}>
            {footerColumns.map((column) => {
              const isOpen = openColumn === column.id;

              return (
                <div
                  className={`${styles.column} ${
                    isOpen ? styles.columnOpen : ''
                  }`}
                  key={column.id}
                >
                  <button
                    className={styles.columnHeader}
                    type="button"
                    onClick={() => handleColumnClick(column.id)}
                    aria-expanded={isOpen}
                  >
                    <h4>{column.title}</h4>

                    <span
                      className={`${styles.arrow} ${
                        isOpen ? styles.arrowOpen : ''
                      }`}
                      aria-hidden="true"
                    >
                      ⌄
                    </span>
                  </button>

                  <div className={styles.links}>
                    {column.links.map((link) => (
                      <Link to={link.to} key={link.to}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.subfooter}>
          <div className={styles.row} style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <a href="https://facebook.com/vexa" target="_blank" rel="noopener noreferrer">
             <img src={facebook} alt="Facebook" />
            </a>
             <a href="https://instagram.com/vexa" target="_blank" rel="noopener noreferrer">
                <img src={instagram} alt="Instagram" />
            </a>
            <a href="https://tiktok.com/@vexa" target="_blank" rel="noopener noreferrer">
               <img src={tiktok} alt="TikTok" />
            </a>
            <a href="https://t.me/vexa" target="_blank" rel="noopener noreferrer">
              <img src={telegram} alt="Telegram" />
            </a>
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
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

import styles from './Footer.module.css';

import { Container } from '../container/Container';
import { Logo } from '../../ui/logo/Logo.jsx';

const footerColumns = [
  {
    id: 'platform',
    title: 'Платформа',
    links: [
      { to: routes.catalog(), label: 'Каталог курсів' },
      { to: routes.forAuthors(), label: 'Для авторів' },
      { to: routes.faq(), label: 'FAQ' },
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
      { to: '/partners', label: 'Для партнерів' },
      { to: '/brands', label: 'Для брендів' },
    ],
  },
  {
    id: 'brands',
    title: 'Бренди',
    links: [
      { to: '/advertising', label: 'Рекламні можливості' },
      { to: '/projects', label: 'Спільні проєкти' },
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
          {/* <div className={styles.row}>
            <Link to="/facebook">
              <img src={facebook} alt="" aria-hidden="true" />
            </Link>
            <Link to="/instagram">
              <img src={instagram} alt="" aria-hidden="true" />
            </Link>
            <Link to="/tiktok">
              <img src={tiktok} alt="" aria-hidden="true" />
            </Link>
            <Link to="/telegram">
              <img src={telegram} alt="" aria-hidden="true" />
            </Link>
          </div> */}

          <div className={styles.copyright}>
            © 2026 Vexa. Усі права захищені
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
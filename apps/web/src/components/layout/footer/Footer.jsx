// import styles from './Footer.module.css';
// import { Link } from 'react-router-dom';
// import { Container } from '../container/Container';
// import facebook from '../../../assets/socialmedia/fb.svg';
// import instagram from '../../../assets/socialmedia/inst.svg';
// import tiktok from '../../../assets/socialmedia/tt.svg';
// import telegram from '../../../assets/socialmedia/tg.svg';

// import { Logo } from '../../ui/logo/Logo.jsx'

// const Footer = () => {
//   return (
//     <footer className={styles.footer}>
//       <Container>
//         <div className={styles.container}>

//           <div className={styles.about}>
//             <Logo />

//             <p className={styles.description}>
//               Платформа онлайн-курсів для тих, хто хоче розвиватися та досягати більшого.
//             </p>
//           </div>

//           <div className={styles.column}>
//             <h4>Платформа</h4>

//             <Link to="/courses">Каталог курсів</Link>
//             <Link to="/authors">Автори</Link>
//             <Link to="/ai">Vexa AI</Link>
//             <Link to="/faq">FAQ</Link>
//             <Link to="/veterans">Для ветеранів</Link>
//             <Link to="/blog">Блог</Link>
//           </div>

//           <div className={styles.column}>
//             <h4>Компанія</h4>

//             <Link to="/about">Про нас</Link>
//             <Link to="/contacts">Контакти</Link>
//             <Link to="/career">Кар’єра</Link>
//             <Link to="/vacancies">Вакансії</Link>
//             <Link to="/press">Прес-центр</Link>
//           </div>

//           <div className={styles.column}>
//             <h4>Підтримка</h4>

//             <Link to="/help">Допомога</Link>
//             <Link to="/terms">Умови використання</Link>
//             <Link to="/privacy">Політика конфіденційності</Link>
//             <Link to="/refund">Повернення коштів</Link>
//           </div>

//           <div className={styles.column}>
//             <h4>Співпраця</h4>

//             <Link to="/become-author">Стати автором</Link>
//             <Link to="/partners">Для партнерів</Link>
//             <Link to="/brands">Для брендів</Link>
//           </div>

//           <div className={styles.column}>
//             <h4>Бренди</h4>

//             <Link to="/advertising">Рекламні можливості</Link>
//             <Link to="/projects">Спільні проєкти</Link>
//           </div>
//         </div>

//         <div className={styles.subfooter}>
//           <div className={styles.row}>
//             <Link to="/facebook"><img src={facebook} alt="" aria-hidden="true" /></Link>
//             <Link to="/instagram"><img src={instagram} alt="" aria-hidden="true" /></Link>
//             <Link to="/tiktok"><img src={tiktok} alt="" aria-hidden="true" /></Link>
//             <Link to="/telegram"><img src={telegram} alt="" aria-hidden="true" /></Link>
//           </div>

//           <div className={styles.copyright}>
//             © 2026 Vexa. Усі права захищені
//           </div>
//         </div>

//       </Container>
//     </footer>
//   );
// };

// export default Footer;

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
      { to: '/courses', label: 'Каталог курсів' },
      { to: '/authors', label: 'Автори' },
      { to: '/ai', label: 'Vexa AI' },
      { to: '/faq', label: 'FAQ' },
      { to: '/veterans', label: 'Для ветеранів' },
      { to: '/blog', label: 'Блог' },
    ],
  },
  {
    id: 'company',
    title: 'Компанія',
    links: [
      { to: '/about', label: 'Про нас' },
      { to: '/contacts', label: 'Контакти' },
      { to: '/career', label: 'Кар’єра' },
      { to: '/vacancies', label: 'Вакансії' },
      { to: '/press', label: 'Прес-центр' },
    ],
  },
  {
    id: 'support',
    title: 'Підтримка',
    links: [
      { to: '/help', label: 'Допомога' },
      { to: '/terms', label: 'Умови використання' },
      { to: '/privacy', label: 'Політика конфіденційності' },
      { to: '/refund', label: 'Повернення коштів' },
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
          <div className={styles.row}>
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
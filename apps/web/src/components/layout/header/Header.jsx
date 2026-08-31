// import styles from './Header.module.css';
// import { Logo } from '../../ui/logo/Logo.jsx'
// import { Search } from '../../ui/search/Search.jsx'
// import Button from '../../ui/buttons/Button.jsx'
// import {Container} from '../container/Container.jsx';
// import { Link } from 'react-router-dom';
// import { useState } from 'react'

// import { routes } from '@vexa/shared';

// const Header = () => {
//   const [isMenuOpen, setIsMenuOpen] = useState(false);

//   return (
//     <header className={styles.header}>
//       <Container>
//         <div className={styles.container}>

//          <div className={styles.logo}>
//             <Logo />
//           </div>
//           {/* <Logo /> */}
//           <nav className={`${styles.navigation} ${
//               isMenuOpen ? styles.navigationOpen : ''
//             }`}
//           >
//             <Link to={routes.catalog()} className={styles.link}>Каталог курсів</Link>
//             <Link to={routes.forAuthors()} className={styles.link}>Для авторів</Link>     
//             <Link to={routes.vexaAi()} className={styles.link}>Vexa AI</Link>
//           </nav>

//           <Search />

//           <div className={styles.actions}>
//             <Button title="Розпочати курс" />
//             <Button title="Мій простір" />
//           </div>

//           <button
//             type="button"
//             className={styles.burger}
//             onClick={() => setIsMenuOpen(!isMenuOpen)}
//             aria-label={isMenuOpen ? 'Закрити меню' : 'Відкрити меню'}
//           >
//             <span />
//             <span />
//             <span />
//           </button>
//         </div>
//         </Container>
//     </header>
//   )
// };

// export default Header;

import { useState } from 'react'
import styles from './Header.module.css'

import { Logo } from '../../ui/logo/Logo.jsx'
import { Search } from '../../ui/search/Search.jsx'
import Button from '../../ui/buttons/Button.jsx'
import { Container } from '../container/Container.jsx'

import { Link } from 'react-router-dom'
import { routes } from '@vexa/shared'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.container}>

          <div className={styles.logo}>
            <Logo />
          </div>

          {/* Desktop navigation */}
          <nav className={styles.navigation}>
            <Link
              to={routes.catalog()}
              className={styles.link}
            >
              Каталог курсів
            </Link>

            <Link
              to={routes.forAuthors()}
              className={styles.link}
            >
              Для авторів
            </Link>

            <Link
              to={routes.vexaAi()}
              className={styles.link}
            >
              Vexa AI
            </Link>
          </nav>

          {/* Desktop search */}
          <div className={styles.desktopSearch}>
            <Search />
          </div>

          {/* Desktop buttons */}
          <div className={styles.actions}>
            <Button title="Розпочати курс" />
            <Button title="Мій простір" />
          </div>

          {/* Burger */}
          <button
            type="button"
            className={styles.burger}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={
              isMenuOpen
                ? 'Закрити меню'
                : 'Відкрити меню'
            }
          >
            <span />
            <span />
            <span />
          </button>

          {/* Tablet / Mobile menu */}
          {isMenuOpen && (
            <div className={styles.mobileMenu}>

              <div className={styles.mobileSearch}>
                <Search />
              </div>

              <nav className={styles.mobileNavigation}>
                <Link
                  to={routes.catalog()}
                  className={styles.link}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Каталог курсів
                </Link>

                <Link
                  to={routes.forAuthors()}
                  className={styles.link}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Для авторів
                </Link>

                <Link
                  to={routes.vexaAi()}
                  className={styles.link}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Vexa AI
                </Link>
              </nav>

              <div className={styles.mobileActions}>
                <Button title="Розпочати курс" />
                <Button title="Мій простір" />
              </div>

            </div>
          )}

        </div>
      </Container>
    </header>
  )
}

export default Header
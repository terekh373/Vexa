import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import styles from './Header.module.css';
import { Logo } from '../../ui/logo/Logo.jsx';
import { Search } from '../../ui/search/Search.jsx';
import Button from '../../ui/buttons/Button.jsx';
import { Container } from '../container/Container.jsx';
import { useAuth } from '../../../context/auth-context.js';

const Header = () => {
  const navigate = useNavigate();
  const { user, isLoading, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const goTo = (path) => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    navigate(path);
  };

  const getSpaceRoute = () => {
    if (user?.roles?.includes('ADMIN')) return routes.adminDashboard();
    if (user?.roles?.includes('AUTHOR')) return routes.authorDashboard();
    return routes.learning();
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    await logout();
    navigate(routes.home(), { replace: true });
  };

  const guestActions = (
    <>
      <Button title="Розпочати курс" onClick={() => goTo(routes.register())} />
      <Button title="Увійти" variant="secondary" onClick={() => goTo(routes.login())} />
    </>
  );

  const signedInActions = (
    <>
      <Button title="Мій простір" onClick={() => goTo(getSpaceRoute())} />
      <div className={styles.userMenuWrap}>
        <button
          type="button"
          className={styles.userMenuButton}
          onClick={() => setIsUserMenuOpen((open) => !open)}
          aria-expanded={isUserMenuOpen}
          aria-haspopup="menu"
        >
          {user?.fullName || user?.email}
        </button>

        {isUserMenuOpen && (
          <div className={styles.userMenu} role="menu">
            <span className={styles.userEmail}>{user?.email}</span>
            <button type="button" className={styles.logoutButton} onClick={handleLogout} role="menuitem">
              Вийти
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.container}>
          <div className={styles.logo}>
            <Logo />
          </div>

          <nav className={styles.navigation}>
            <Link to={routes.catalog()} className={styles.link}>Каталог курсів</Link>
            <Link to={routes.forAuthors()} className={styles.link}>Для авторів</Link>
            <Link to={routes.vexaAi()} className={styles.link}>Vexa AI</Link>
          </nav>

          <div className={styles.desktopSearch}>
            <Search />
          </div>

          <div className={styles.actions}>
            {!isLoading && (user ? signedInActions : guestActions)}
          </div>

          <button
            type="button"
            className={styles.burger}
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? 'Закрити меню' : 'Відкрити меню'}
            aria-expanded={isMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          {isMenuOpen && (
            <div className={styles.mobileMenu}>
              <div className={styles.mobileSearch}>
                <Search />
              </div>

              <nav className={styles.mobileNavigation}>
                <Link to={routes.catalog()} className={styles.link} onClick={() => setIsMenuOpen(false)}>
                  Каталог курсів
                </Link>
                <Link to={routes.forAuthors()} className={styles.link} onClick={() => setIsMenuOpen(false)}>
                  Для авторів
                </Link>
                <Link to={routes.vexaAi()} className={styles.link} onClick={() => setIsMenuOpen(false)}>
                  Vexa AI
                </Link>
              </nav>

              {!isLoading && (
                <div className={styles.mobileActions}>
                  {user ? (
                    <>
                      <span className={styles.mobileUser}>{user.fullName || user.email}</span>
                      <Button title="Мій простір" onClick={() => goTo(getSpaceRoute())} />
                      <Button title="Вийти" variant="secondary" onClick={handleLogout} />
                    </>
                  ) : guestActions}
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </header>
  );
};

export default Header;

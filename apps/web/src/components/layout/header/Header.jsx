import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { routes } from '@vexa/shared';

import styles from './Header.module.css';

import { Logo } from '../../ui/logo/Logo.jsx';
import { Search } from '../../ui/search/Search.jsx';
import Button from '../../ui/buttons/Button.jsx';
import { Container } from '../container/Container.jsx';
import UserMenu from './user-menu/UserMenu.jsx';
import BellIcon from '../../../assets/icons/bell.svg';
import NotificationModal from './notification-modal/NotificationModal.jsx';

import { useAuth } from '../../../context/auth-context.js';
import { useCourseSuggestions } from '../../../hooks/useCourseSuggestions.js';

const Header = () => {
  const navigate = useNavigate();

  const { user, isLoading, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchSuggestions = useCourseSuggestions(searchValue);

  const isAuthor = user?.roles?.includes('AUTHOR');
  const isStudent = user?.roles?.includes('STUDENT');
  const isAdmin = user?.roles?.includes('ADMIN');

  const goTo = (path) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const handleSearch = (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    const search = searchValue.trim();

    if (!search) {
      return;
    }

    setIsMenuOpen(false);
    navigate(routes.catalog({ q: search }));
  };

  const handleSuggestionSelect = (suggestion) => {
    setSearchValue(suggestion.title);
    setIsMenuOpen(false);
    navigate(routes.course(suggestion.slug || suggestion.id));
  };

  const getSpaceRoute = () => {
    if (isAdmin) {
      return routes.adminDashboard();
    }

    if (isAuthor) {
      return routes.authorDashboard();
    }

    return routes.learning();
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);

    await logout();

    navigate(routes.home(), { replace: true });
  };

  const guestNavigation = (
    <>
      <Link to={routes.catalog()} className={styles.link}>
        Каталог курсів
      </Link>

      <Link to={routes.forAuthors()} className={styles.link}>
        Для авторів
      </Link>

      <Link to={routes.vexaAi()} className={styles.link}>
        Vexa AI
      </Link>
    </>
  );

  const authorNavigation = (
    <>
      <Link to={routes.authorDashboard()} className={styles.link}>
        Дашборд
      </Link>

      <Link to={routes.authorCourses()} className={styles.link}>
        Мої курси
      </Link>

      <Link to={routes.authorBalance()} className={styles.link}>
        Баланс
      </Link>

      <Link to={routes.authorReviews()} className={styles.link}>
        Відгуки
      </Link>
    </>
  );

  const studentNavigation = (
    <>
      <Link to={routes.studentDashboard()} className={styles.link}>
        Кабінет
      </Link>

      <Link to={routes.learning()} className={styles.link}>
        Мої курси
      </Link>

      <Link to={routes.schedule()} className={styles.link}>
        Розклад
      </Link>

      <Link to={routes.catalog()} className={styles.link}>
        Каталог
      </Link>
    </>
  );

  const adminNavigation = (
    <>
      <Link to={routes.adminDashboard()} className={styles.link}>
        Головна
      </Link>

      <Link to={routes.adminUsers()} className={styles.link}>
        Користувачі
      </Link>

      <Link to={routes.adminModeration()} className={styles.link}>
        Модерація
      </Link>

      <Link to={routes.adminCategories()} className={styles.link}>
        Категорії
      </Link>
    </>
  );

  const getNavigation = () => {
    if (!user) {
      return guestNavigation;
    }

    if (isAdmin) {
      return adminNavigation;
    }

    if (isAuthor) {
      return authorNavigation;
    }

    if (isStudent) {
      return studentNavigation;
    }

    return guestNavigation;
  };

  const guestActions = (
    <>
      <Button
        title="Розпочати курс"
        onClick={() => goTo(routes.register())}
      />

      <Button
        title="Увійти"
        variant="secondary"
        onClick={() => goTo(routes.login())}
      />
    </>
  );

  const signedInActions = (
    <>
      <Button title="Мій простір" onClick={() => goTo(getSpaceRoute())} />
      <button
        type="button"
        className={styles.notificationButton}
        aria-label="Повідомлення"
        onClick={() => setIsNotificationOpen(true)}
      >
        <img
          src={BellIcon}
          alt=""
          aria-hidden="true"
        />
      </button>

      <UserMenu
        user={user}
        onLogout={handleLogout}
      />
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
            {getNavigation()}
          </nav>

          <div className={styles.desktopSearch}>
            <Search
              value={searchValue}
              suggestions={searchSuggestions}
              onSuggestionSelect={handleSuggestionSelect}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={handleSearch}
            />
          </div>

          <div className={styles.actions}>
            {!isLoading && (
              user ? signedInActions : guestActions
            )}
          </div>

          {/* Burger */}
          <button
            type="button"
            className={styles.burger}
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={
              isMenuOpen
                ? 'Закрити меню'
                : 'Відкрити меню'
            }
            aria-expanded={isMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className={styles.mobileMenu}>
              <div className={styles.mobileSearch}>
                <Search
                  value={searchValue}
                  suggestions={searchSuggestions}
                  onSuggestionSelect={handleSuggestionSelect}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>

              <nav
                className={styles.mobileNavigation}
                onClick={() => setIsMenuOpen(false)}
              >
                {getNavigation()}
              </nav>

              {!isLoading && (
                <div className={styles.mobileActions}>
                  {user ? (
                      <>
                        <span className={styles.mobileUser}>
                          {user.fullName || user.email}
                        </span>

                        <Button
                          title="Мій простір"
                          onClick={() => goTo(getSpaceRoute())}
                        />

                        <Button
                          title="Редагувати профіль"
                          variant="secondary"
                          onClick={() => goTo(routes.profileEdit())}
                        />

                        <Button
                          title="Налаштування"
                          variant="secondary"
                          onClick={() => goTo(routes.settings())}
                        />

                        <Button
                          title="Кошик"
                          variant="secondary"
                          onClick={() => goTo(routes.cart())}
                        />

                        <Button
                          title="Мої замовлення"
                          variant="secondary"
                          onClick={() => goTo(routes.orders())}
                        />

                        {isAuthor && (
                          <Button
                            title="Кабінет автора"
                            variant="secondary"
                            onClick={() => goTo(routes.authorDashboard())}
                          />
                        )}

                        {isAdmin && (
                          <Button
                            title="Адмін-панель"
                            variant="secondary"
                            onClick={() => goTo(routes.adminDashboard())}
                          />
                        )}

                        <Button
                          title="Вийти"
                          variant="secondary"
                          onClick={handleLogout}
                        />
                      </>
                  ) : (
                    guestActions
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
      {isNotificationOpen && (
        <NotificationModal
          onClose={() => setIsNotificationOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;
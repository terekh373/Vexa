import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import styles from './UserMenu.module.css';
import BasketIcon from '../../../../assets/icons/basket.svg';
import SettingsIcon from '../../../../assets/icons/settings.svg';
import EditorIcon from '../../../../assets/icons/edit.svg';
import WalletIcon from '../../../../assets/icons/wallet.svg';

const UserMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const isAuthor = user?.roles?.includes('AUTHOR');
  const isAdmin = user?.roles?.includes('ADMIN');

  const getRoleLabel = () => {
    if (isAdmin) return 'адміністратор';
    if (isAuthor) return 'викладач';

    return 'студент';
  };

  const goTo = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className={styles.wrapper} ref={menuRef}>
      <button
        type="button"
        className={styles.userButton}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className={styles.avatar}>
          {user?.avatar?.url ? (
            <img
              src={user.avatar.url}
              alt={user.fullName || 'Користувач'}
            />
          ) : (
            <span>
              {(user?.fullName || user?.email || 'U')
                .charAt(0)
                .toUpperCase()}
            </span>
          )}
        </div>

        <div className={styles.userInfo}>
          <span className={styles.userName}>
            {user?.fullName || user?.email}
          </span>

          <span className={styles.userRole}>
            {getRoleLabel()}
          </span>
        </div>

        <span
          className={`${styles.arrow} ${
            isOpen ? styles.arrowOpen : ''
          }`}
          aria-hidden="true"
        >
         ⌄
        </span>
      </button>

      {isOpen && (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => goTo(routes.profileEdit())}
            role="menuitem"
          >
            <img src={EditorIcon} alt='editor icon' className={styles.icon} />           
            Редагувати профіль
          </button>

          <button
            type="button"
            className={styles.menuItem}
            onClick={() => goTo(routes.settings())}
            role="menuitem"
          >
            <img src={SettingsIcon} alt='settings icon' className={styles.icon} />           
            Налаштування
          </button>

          <button
            type="button"
            className={styles.menuItem}
            onClick={() => goTo(routes.cart())}
            role="menuitem"
          >
            <img src={BasketIcon} alt='basket icon' className={styles.icon} />           
            Кошик
          </button>
          
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => goTo(routes.orders())}
            role="menuitem"
          >
            <img src={WalletIcon} alt='wallet icon' className={styles.icon} />           
            Мої замовлення
          </button>

          {isAuthor && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => goTo(routes.authorDashboard())}
              role="menuitem"
            >
              <span className={styles.icon}>▣</span>
              Кабінет автора
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => goTo(routes.adminDashboard())}
              role="menuitem"
            >
              <span className={styles.icon}>▦</span>
              Адмін-панель
            </button>
          )}

          <div className={styles.divider} />

          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            role="menuitem"
          >
            <span className={styles.icon}>↪</span>
            Вийти
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
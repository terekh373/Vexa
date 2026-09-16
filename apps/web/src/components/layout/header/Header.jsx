import React, { useContext } from 'react';
import styles from './Header.module.css';
import { Logo } from '../../ui/logo/Logo.jsx';
import { Search } from '../../ui/search/Search.jsx';
import Button from '../../ui/buttons/Button.jsx';
import { Container } from '../container/Container.jsx';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext.jsx';
import { routes } from '@vexa/shared';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const isAuthPage = ['/login', '/register', '/role-selection'].includes(location.pathname);

  const firstName = user?.fullName || user?.name || 'Студент';
  const role = user?.role?.toLowerCase() === 'teacher' ? 'викладач' : 'студент';
  const initials = firstName.substring(0, 2).toUpperCase();

  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.container}>
          
          <Logo />

          {user ? (
            <nav className={styles.navAuth}>
              <NavLink to="/profile" className={({isActive}) => isActive ? styles.activeLink : styles.link}>Головна</NavLink>
              <NavLink to="/learning" className={({isActive}) => isActive ? styles.activeLink : styles.link}>Мої курси</NavLink>
              <NavLink to="/schedule" className={({isActive}) => isActive ? styles.activeLink : styles.link}>Розклад</NavLink>
              <NavLink to="/achievements" className={({isActive}) => isActive ? styles.activeLink : styles.link}>Досягнення</NavLink>
              <NavLink to="/support" className={({isActive}) => isActive ? styles.activeLink : styles.link}>Підтримка</NavLink>
            </nav>
          ) : (
            <ul className={styles.list}>
              <li>
                <Link to={typeof routes.catalog === 'function' ? routes.catalog() : (routes.catalog || '/catalog')} className={styles.link}>
                  Каталог курсів
                </Link>
              </li>
              <li>
                <Link to={routes.forAuthors} className={styles.link}>Для авторів</Link>
              </li>
              <li>
                <Link to={routes.vexaAi} className={styles.link}>Vexa AI</Link>
              </li>
            </ul>
          )}

          <Search />

          <div className={styles.actionButtons}>
            
            {user ? (
              <div className={styles.userArea}>
                <button className={styles.notificationBtn}>🔔</button>
                <div className={styles.profileDropdown} onClick={() => navigate('/edit-profile')}>
                  <img 
                    src={`https://ui-avatars.com/api/?name=${initials}&background=6236FF&color=fff`} 
                    alt="Avatar" 
                    className={styles.avatarMini} 
                  />
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{firstName}</span>
                    <span className={styles.userRole}>{role}</span>
                  </div>
                </div>
              </div>
            ) : isAuthPage ? (
              <div className={styles.authPrompt}>
                <span className={styles.questionText}>Вже маєте акаунт?</span>
                <span className={styles.loginText} onClick={() => navigate('/login')}>
                  Увійти
                </span>
              </div>
            ) : (
              <>
                <Button title='Розпочати курс' onClick={() => {}} />
                <Button 
                  title='Мій простір' 
                  onClick={() => navigate('/role-selection')} 
                />
              </>
            )}

          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;
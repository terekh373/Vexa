import React, { useContext } from 'react';
import styles from './Header.module.css';
import { Logo } from '../../ui/logo/Logo.jsx';
import { Search } from '../../ui/search/Search.jsx';
import Button from '../../ui/buttons/Button.jsx';
import { Container } from '../container/Container.jsx';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext.jsx';
import { routes } from '@vexa/shared';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const isAuthPage = ['/login', '/register', '/role-selection'].includes(location.pathname);

  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.container}>
          <Logo />
          <ul className={styles.list}>
            <li>
              <Link to={routes.catalog} className={styles.link}>Каталог курсів</Link>
            </li>
            <li>
              <Link to={routes.forAuthors} className={styles.link}>Для авторів</Link>
            </li>
            <li>
              <Link to={routes.vexaAi} className={styles.link}>Vexa AI</Link>
            </li>
          </ul>

          <Search />

          <div className={styles.actionButtons}>
            
            {isAuthPage ? (
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
                  onClick={() => navigate(user ? '/profile' : '/role-selection')} 
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
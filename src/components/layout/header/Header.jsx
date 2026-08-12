import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import styles from './Header.module.css';
import { Logo } from '../../ui/logo/Logo.jsx';
import { Search } from '../../ui/search/Search.jsx';
import Button from '../../ui/buttons/Button.jsx';
import { Container } from '../container/Container.jsx';
import LoginModal from '../../ui/modals/LoginModal.jsx'; 

const Header = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const setLinkStyle = ({ isActive }) => (isActive ? styles.activeLink : styles.defaultLink);

  return (
    <>
      <header className={styles.header}>
        <Container>
          <div className={styles.container}>
            
            <Link to="/" className={styles.logoLink}>
              <Logo />
            </Link>

            <ul className={styles.list}>
              <li>
                <NavLink to="/" className={setLinkStyle}>
                  Каталог курсів
                </NavLink>
              </li>
              <li>
                <a className={styles.defaultLink}>Для авторів</a>
              </li>
              <li>
                <NavLink to="/vexa-ai" className={setLinkStyle}>
                  Vexa AI
                </NavLink>
              </li>
            </ul>

            <Search />

            <ul className={styles.list}>
              <Button title='Розпочати курс'/>
              <Button 
                title='Мій простір' 
                onClick={() => setIsLoginOpen(true)} 
              />
            </ul>
          </div>
        </Container>
      </header>

      {isLoginOpen && (
        <LoginModal onClose={() => setIsLoginOpen(false)} />
      )}
    </>
  )
}

export default Header;
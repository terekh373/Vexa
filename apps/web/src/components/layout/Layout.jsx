import { Outlet } from 'react-router-dom';

import Header from './header/Header.jsx';
import Footer from './footer/Footer.jsx';
import Newsletter from '../sections/newsletter/Newsletter.jsx';

import styles from './Layout.module.css';

const Layout = () => {
  return (
    <div className={styles.layout}>
      <Header />

      <main className={styles.main}>
        <Outlet />
      </main>

      <Newsletter />
      <Footer />
    </div>
  );
};

export default Layout;
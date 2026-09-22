import { NavLink, Outlet } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import styles from './Admin.module.css';

const navItems = [
  { to: routes.adminModeration(), label: 'Модерація курсів' },
  { to: routes.adminUsers(), label: 'Користувачі' },
  { to: routes.adminCategories(), label: 'Категорії' },
];

const AdminLayout = () => (
  <main className={styles.adminPage}>
    <Container>
      <header className={styles.adminHeader}>
        <div>
          <p className={styles.eyebrow}>Адміністрування</p>
          <h1 className={styles.adminTitle}>Адмін-панель</h1>
          <p className={styles.adminSubtitle}>Модерація контенту, користувачів і каталогу Vexa.</p>
        </div>
      </header>

      <nav className={styles.adminNav} aria-label="Розділи адмін-панелі">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `${styles.adminNavLink} ${isActive ? styles.adminNavLinkActive : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </Container>
  </main>
);

export default AdminLayout;

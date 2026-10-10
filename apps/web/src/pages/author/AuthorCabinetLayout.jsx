import { NavLink, Outlet } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import styles from './AuthorCabinet.module.css';

const NAV_ITEMS = [
  { to: routes.authorDashboard(), label: 'Дашборд', end: true },
  { to: routes.authorCourses(), label: 'Мої курси' },
  { to: routes.authorBalance(), label: 'Баланс і виплати' },
  { to: routes.authorReviews(), label: 'Відгуки' },
];

const AuthorCabinetLayout = () => (
  <>
    <div className={styles.cabinetNavWrap}>
      <Container>
        <nav className={styles.cabinetNav} aria-label="Навігація кабінету автора">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${styles.cabinetNavLink} ${isActive ? styles.cabinetNavLinkActive : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </Container>
    </div>

    <Outlet />
  </>
);

export default AuthorCabinetLayout;

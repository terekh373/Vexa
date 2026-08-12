import { Link } from 'react-router-dom'
import styles from './Breadcrumbs.module.css'

const Breadcrumbs = () => {
  return (
    <nav className={styles.breadcrumbs} aria-label="Хлібні крихти">
      <Link to='/' className={styles.link}>Головна</Link>
      <span className={styles.separator}>/</span>
      <span className={styles.current}>
        Каталог курсів
      </span>
    </nav>
  )
};

export default Breadcrumbs;
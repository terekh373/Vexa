import { Link } from 'react-router-dom'
import styles from './Breadcrumbs.module.css'

const Breadcrumbs = ({title, link, pages}) => {
  return (
    <nav className={styles.breadcrumbs} aria-label="Хлібні крихти">
      <Link to={link} className={styles.link}>{title}</Link>
      <span className={styles.separator}>/</span>
      <span className={styles.current}>
       {pages}
      </span>
    </nav>
  )
};

export default Breadcrumbs;
import { Link } from 'react-router-dom'
import styles from './ToLessonButton.module.css'
import arrowRight from '../../../assets/icons/arrow-forward.svg';

const ToLessonButton = ({ title, subtitle, icon, to }) => {
  return (
    <Link to={to} className={styles.card}>

      <div className={styles.description}>
        <img src={icon} alt='' className={styles.icon} aria-hidden='true' />

        <div className={styles.content}>
          <div className={styles.title}>{title}</div>
          <div className={styles.subtitle}>{subtitle}</div>
        </div>
      </div>
    
      <img
        src={arrowRight}
        alt=""
        className={styles.arrow}
        aria-hidden="true"
      />
    </Link>
  )
}

export default ToLessonButton;
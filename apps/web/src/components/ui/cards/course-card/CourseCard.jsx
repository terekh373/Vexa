import styles from './CourseCard.module.css'
import star from '../../../../assets/icons/star.svg'
import badge from '../../../../assets/icons/badge.svg'

import { Link } from 'react-router-dom'
import { routes } from '@vexa/shared'

const CourseCard = ({ card }) => (
  <Link to={routes.course(card.id)} className={styles.card}>

    {card.isNew && (
      <>
        <div className={styles.new}>
          new
        </div>
        <img src={badge} className={styles.badge} alt='badge icon' />
      </>
    )}

    <img 
        src={card.image} 
        alt={`Course ${card.id}`} 
        className={styles.img} 
    />
    <div className={styles.description}>
      <p>{card.description}</p>
      <h4>{card.author}</h4>
    </div>

    <div className={styles.pricerow}>
      <div className={styles.row}>
        <img src={star} alt='star icon'/>
        <p>
          <span>{card.rating}</span> <span>({card.reviews})</span>
        </p>
      </div>
  
      <p className={styles.price}>
        ${card.price.toFixed(2)}
      </p>
    </div>
  </Link>
)

export default CourseCard;
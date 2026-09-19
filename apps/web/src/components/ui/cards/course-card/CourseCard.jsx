import styles from './CourseCard.module.css';
import star from '../../../../assets/icons/star.svg';
import badge from '../../../../assets/icons/badge.svg';
import fallbackImage from '../../../../assets/images/img01.png';

import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

const formatPrice = (price) => {
  if (price && typeof price === 'object') {
    const amount = Number(price.amount) || 0;

    if (amount === 0) {
      return 'Безкоштовно';
    }

    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: price.currency || 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  }

  return `$${Number(price || 0).toFixed(2)}`;
};

const CourseCard = ({ card }) => {
  const image = card.cover?.url || card.image || fallbackImage;
  const description = card.shortDescription || card.description || '';
  const author = typeof card.author === 'string'
    ? card.author
    : card.author?.displayName || '';
  const rating = card.rating?.average ?? card.rating ?? 0;
  const reviews = card.rating?.reviewsCount ?? card.reviews ?? 0;
  const coursePath = routes.course(card.slug || String(card.id));

  return (
    <Link to={coursePath} className={styles.card}>
      {card.isNew && (
        <>
          <div className={styles.new}>new</div>
          <img src={badge} className={styles.badge} alt='badge icon' />
        </>
      )}

      <img
        src={image}
        alt={card.title || `Course ${card.id}`}
        className={styles.img}
      />

      <div className={styles.description}>
        {card.title && <h3 className={styles.courseTitle}>{card.title}</h3>}
        {description && <p>{description}</p>}
        <h4>{author}</h4>
      </div>

      <div className={styles.pricerow}>
        <div className={styles.row}>
          <img src={star} alt='star icon' />
          <p>
            <span>{Number(rating).toFixed(1)}</span>{' '}
            <span>({reviews})</span>
          </p>
        </div>

        <p className={styles.price}>{formatPrice(card.price)}</p>
      </div>
    </Link>
  );
};

export default CourseCard;

import styles from './FeatureCard.module.css'
import arrow from '../../../../assets/icons/for-authors-icons/arrow_right_alt.svg'

export const FeatureCard = ({ card, variant, showArrow}) => (
  <div className={`${styles.card} ${styles[variant]}`}>
    {card.decorImage && (
      <img
        className={styles.decorImage}
        src={card.decorImage}
        alt='decor image'
      />
    )}

    <img src={card.image} alt={card.imageAlt} />
    <h4>{card.title}</h4>
    <p>{card.subtitle}</p>

    {showArrow && (
      <img
        className={styles.arrow}
        src={arrow}
        alt=""
      />
    )}
  </div>
);
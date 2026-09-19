import styles from './FeatureCard.module.css'
import arrow from '../../../../assets/icons/for-authors-icons/arrow_right_alt.svg'

import defaultIcon01 from '../../../../assets/icons/course-page/li-01.svg'
import defaultIcon02 from '../../../../assets/icons/course-page/li-02.svg'
import defaultIcon03 from '../../../../assets/icons/course-page/li-03.svg'
import defaultIcon04 from '../../../../assets/icons/course-page/li-04.svg'
import defaultIcon05 from '../../../../assets/icons/course-page/li-05.svg'

const defaultIcons = [
  defaultIcon01,
  defaultIcon02,
  defaultIcon03,
  defaultIcon04,
  defaultIcon05,
];

export const FeatureCard = ({ card, variant, showArrow, index }) => {
  const image = card.image || (variant === 'whatYouCanLearn'
      ? defaultIcons[index % defaultIcons.length]
      : null);

  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      {card.decorImage && (
        <img
          className={styles.decorImage}
          src={card.decorImage}
          alt='decor image'
        />
      )}

      {/* <img src={card.image} alt={card.imageAlt} /> */}
      {image && (
        <img
          src={image}
          alt={card.imageAlt || ''}
        />
      )}

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
  )
};
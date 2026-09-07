import styles from './StudentsReviewCard.module.css'
import purpleStarIcon from '../../../../assets/icons/star-purple.svg'
import greyStarIcon from '../../../../assets/icons/star-grey.svg'
const STARS_LENGTH = 5;

export const StudentsReviewCard = ({ card }) => (
  <div className={styles.card}>
    <div className={styles.row}>
      <img src={card.image}/>
      <p>{card.review}</p>
    </div>

    <div className={styles.box}>
      <div className={styles.author}>
        <h4>{card.name}</h4>
        <span>{card.reviewDate}</span>
      </div>

      <div>
      {Array.from({ length: STARS_LENGTH }).map((_, index) => (
        <img
          key={index}
          src={index < card.stars ? purpleStarIcon : greyStarIcon}
          alt="star icon"
          className={styles.starIcon}
        />
      ))}
      </div>
    </div>
  </div>
);
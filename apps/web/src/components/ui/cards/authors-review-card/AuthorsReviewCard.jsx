import styles from './AuthorsReviewCard.module.css'
import starIcon from '../../../../assets/icons/star-purple.svg'

export const AuthorsReviewCard = ({ card }) => (
  <div className={styles.card}>
    <div className={styles.row}>
      <img src={card.image}/>
      <p>«{card.review}»</p>
    </div>

    <div className={styles.box}>
      <div className={styles.author}>
        <h4>{card.name}</h4>
        <span>{card.position}</span>
      </div>

      <div>
      {Array.from({ length: card.stars }).map((_, index) => (
        <img
          key={index}
          src={starIcon}
          alt="star icon"
          className={styles.starIcon}
        />
      ))}
      </div>
    </div>
  </div>
);
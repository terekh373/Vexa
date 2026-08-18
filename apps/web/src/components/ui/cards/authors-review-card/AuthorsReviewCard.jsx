import styles from './AuthorsReviewCard.module.css'


export const AuthorsReviewCard = ({ reviewCard }) => (
  <div className={styles.card}>
    <div className={styles.row}>
      <img src={reviewCard.image}/>
      <p>{reviewCard.review}</p>
    </div>

  </div>
);
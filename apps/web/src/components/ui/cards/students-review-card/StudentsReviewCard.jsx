import styles from './StudentsReviewCard.module.css';
import purpleStarIcon from '../../../../assets/icons/star-purple.svg';
import greyStarIcon from '../../../../assets/icons/star-grey.svg';

const STARS_LENGTH = 5;

const formatDate = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const StudentsReviewCard = ({ card }) => {
  const name = card.author?.name ?? card.name ?? 'Студент';
  const image = card.author?.avatar?.url ?? card.image;
  const review = card.text ?? card.review ?? '';
  const stars = card.rating ?? card.stars ?? 0;
  const reviewDate = formatDate(card.createdAt) || card.reviewDate || '';
  const replyDate = formatDate(card.authorRepliedAt);

  return (
    <article className={styles.card}>
      <div className={styles.content}>
        <div className={styles.row}>
          {image ? (
            <img src={image} alt={name} className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback} aria-hidden="true">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <p>{review}</p>
        </div>

        {card.authorReply && (
          <div className={styles.authorReply}>
            <div className={styles.replyHeader}>
              <strong>Відповідь автора</strong>
              {replyDate && <span>{replyDate}</span>}
            </div>
            <p>{card.authorReply}</p>
          </div>
        )}
      </div>

      <div className={styles.box}>
        <div className={styles.author}>
          <h4>{name}</h4>
          <span>{reviewDate}</span>
        </div>

        <div className={styles.stars} aria-label={`Оцінка ${stars} з 5`}>
          {Array.from({ length: STARS_LENGTH }).map((_, index) => (
            <img
              key={index}
              src={index < stars ? purpleStarIcon : greyStarIcon}
              alt=""
              aria-hidden="true"
              className={styles.starIcon}
            />
          ))}
        </div>
      </div>
    </article>
  );
};

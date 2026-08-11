import styled from 'styled-components'
import starIcon from '../../../../assets/icons/star.svg'

const Card = styled.div`
  width: 352px;
  padding: 16px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-grey);
  border-radius: 16px;

  img {
    border-radius: 16px;
    width: 124px;
    height: auto;
    object-fit: contain;
    margin-right: 4px;
  }

  span:first-child {
    display: inline-block;
    color: var(--main-dark-color);
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  span {
    display: block;
    color: var(--secondary-grey);
    font-size: 14px;
    font-weight: 400;
    margin-bottom: 14px;
  }

  p {
    width: 182px;
    color: var(--main-dark-color);
    font-size: 14px;
    font-weight: 400;
    line-height: auto;
    margin-bottom: 22px;
  }
`

const Stars = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
`

const Star = styled.img`
  width: 16px !important;
  height: 16px !important;
  margin: 0 !important;
`

export const ReviewCard = ({ card }) => (
  <Card>
    <img src={card.image} alt='monitor icon' />
    <div>
      <span>{card.userName}</span>
      <span>{card.userNick}</span>
      <p>{card.userReview}</p>

      <Stars>
        {Array.from({ length: card.stars }).map((_, index) => (
          <Star
            key={index}
            src={starIcon}
            alt="star"
          />
        ))}
      </Stars>
    </div>
  
  </Card>
)
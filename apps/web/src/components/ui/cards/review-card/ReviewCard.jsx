import styled from 'styled-components'
import starIcon from '../../../../assets/icons/star.svg'

const Card = styled.div`
  width: 352px;

  display: flex;
  align-items: stretch;
  gap: 4px;

  border: 1px solid var(--border-grey);
  border-radius: 16px;

  padding: 16px 8px;

  box-sizing: border-box;
  overflow: hidden;

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
    width: 100%;
    color: var(--main-dark-color);
    font-size: 14px;
    font-weight: 400;
    line-height: 24px;
    margin-bottom: 22px;

    overflow-wrap: break-word;
    word-break: break-word;
  }
`

const Content = styled.div`
  min-width: 0;

  padding: 0 8px;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: 100%;
`

const Stars = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  margin-top: auto;
`

const Star = styled.img`
  width: 16px !important;
  height: 16px !important;
  margin: 0 !important;
`

const ImageWrapper = styled.div`
  width: 124px;
  min-width: 124px;

  align-self: stretch;

  overflow: hidden;
  border-radius: 16px;

  img {
    display: block;

    width: 100%;
    height: 100%;

    object-fit: cover;
  }
`

export const ReviewCard = ({ card }) => (
  <Card>
    <ImageWrapper>
      <img src={card.image} alt="user photo" />
    </ImageWrapper>

    <Content>
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
    </Content>
  </Card>
)
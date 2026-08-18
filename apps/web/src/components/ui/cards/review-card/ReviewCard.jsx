import styled from 'styled-components'
import starIcon from '../../../../assets/icons/star.svg'

const Card = styled.div`
  width: 352px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  border: 1px solid var(--border-grey);
  border-radius: 16px;
  padding: 16px 8px;
  box-sizing: border-box;


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

const Content = styled.div`
  padding: 0 8px;
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

const ImageWrapper = styled.div`
  width: 124px;
  flex: 0 0 124px;
  align-self: stretch;
  overflow: hidden;
  /* border-radius: 16px; */
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

    <div>
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
    </div>
  
  </Card>
)
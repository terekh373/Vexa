import styled from 'styled-components'
import starIcon from '../../../../assets/icons/star.svg'

const Card = styled.div`
  width: 352px;
  display: flex;
  gap: 4px;

  border: 1px solid var(--border-grey);
  border-radius: 16px;
  padding: 16px 8px;

  box-sizing: border-box;
  overflow: hidden;
`;

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
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const UserName = styled.span`
  display: block;
  color: var(--main-dark-color);
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 2px;
`;

const UserNick = styled.span`
  display: block;
  color: var(--secondary-grey);
  font-size: 14px;
  font-weight: 400;
  margin-bottom: 14px;
`;

const TextReview = styled.p`
  min-width: 0;
  max-width: 100%;
  color: var(--main-dark-color);
  font-size: 14px;
  font-weight: 400;
  margin-bottom: 22px;
  overflow-wrap: break-word;
  word-break: break-word;
`;

const Stars = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  margin-top: auto;
`;

const Star = styled.img`
  width: 16px !important;
  height: 16px !important;
  margin: 0 !important;
`;

export const ReviewCard = ({ card }) => (
  <Card>
    <ImageWrapper>
      <img src={card.image} alt="user photo" />
    </ImageWrapper>

    <Content>
      <UserName>{card.userName}</UserName>
      <UserNick>{card.userNick}</UserNick>
      <TextReview>{card.userReview}</TextReview>

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
);
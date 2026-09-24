import styled from 'styled-components';

import starIcon from '../../../../assets/icons/star.svg';

const Card = styled.div`
  width: 352px;
  min-width: 0;

  display: flex;
  gap: 4px;

  padding: 16px 8px;

  border: 1px solid var(--border-grey);
  border-radius: 16px;

  box-sizing: border-box;
  overflow: hidden;

  @media (max-width: 960px) {
    flex: 1 1 300px;

    width: auto;
    max-width: 420px;
    min-width: 280px;
  }

  @media (max-width: 540px) {
    flex: none;

    width: 100%;
    max-width: none;
    min-width: 0;
  }
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

  @media (max-width: 540px) {
    width: 110px;
    min-width: 110px;
  }

  @media (max-width: 400px) {
    width: 96px;
    min-width: 96px;
  }
`;

const Content = styled.div`
  flex: 1;

  min-width: 0;
  padding: 0 8px;

  display: flex;
  flex-direction: column;
  align-items: flex-start;

  box-sizing: border-box;
`;

const UserName = styled.span`
  display: block;

  margin-bottom: 2px;

  color: var(--main-dark-color);

  font-size: 14px;
  font-weight: 700;
`;

const UserNick = styled.span`
  display: block;

  margin-bottom: 14px;

  color: var(--secondary-grey);

  font-size: 14px;
  font-weight: 400;
`;

const TextReview = styled.p`
  min-width: 0;
  max-width: 100%;

  margin: 0 0 22px;

  color: var(--main-dark-color);

  font-size: 14px;
  font-weight: 400;
  line-height: 20px;

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
      <img
        src={card.image}
        alt={card.userName}
      />
    </ImageWrapper>

    <Content>
      <UserName>{card.userName}</UserName>

      <UserNick>{card.userNick}</UserNick>

      <TextReview>
        {card.userReview}
      </TextReview>

      <Stars>
        {Array.from({ length: card.stars }).map(
          (_, index) => (
            <Star
              key={index}
              src={starIcon}
              alt=""
              aria-hidden="true"
            />
          ),
        )}
      </Stars>
    </Content>
  </Card>
);
import styled from 'styled-components';

import { Container } from '../../layout/container/Container';
import { OpenMore } from '../../ui/openmore/OpenMore';
import { ReviewCard } from '../../ui/cards/main-page-review-card/ReviewCard';

import user01 from '../../../assets/images/user01.png';
import user02 from '../../../assets/images/user02.png';
import user03 from '../../../assets/images/user03.png';

const Section = styled.section`
  padding: 48px 0;

  @media (max-width: 960px) {
    padding: 28px 0;
  }

  @media (max-width: 540px) {
    padding: 26px 0;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 48px;
  padding: 10px;

  /* 900–1200 / небольшой desktop + tablet */
  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: stretch;
    gap: 32px;
    padding: 10px 24px;
  }

  @media (max-width: 960px) {
    gap: 24px;
    padding: 0 44px;
  }

  @media (max-width: 540px) {
    gap: 32px;
    padding: 0;
  }
`;

const Description = styled.p`
  flex: 0 0 222px;
  width: 222px;
  margin: 0;

  color: var(--main-dark-color);

  font-size: 16px;
  font-weight: 400;
  line-height: 24px;

  @media (max-width: 1200px) {
    flex: none;

    width: 100%;
    max-width: 700px;
    margin: 0 auto;

    text-align: center;
  }

  @media (max-width: 540px) {
    max-width: none;

    text-align: left;
  }
`;

const Cards = styled.div`
  display: flex;
  align-items: stretch;
  gap: 48px;

  min-width: 0;

  /* чтобы карточки уже не плющило */
  @media (max-width: 1200px) {
    flex-wrap: wrap;
    justify-content: center;

    width: 100%;
    gap: 24px;
  }

  @media (max-width: 540px) {
    flex-direction: column;
    align-items: stretch;

    gap: 20px;
  }
`;

const cards = [
  {
    id: 1,
    image: user01,
    userName: 'Інна Б.',
    userNick: '@inn.b',
    userReview:
      'Зручна платформа, усе зрозуміло та легко знайти. Навчатися на VEXA справді комфортно.',
    stars: 5,
  },
  {
    id: 2,
    image: user02,
    userName: 'Дмитро М.',
    userNick: '@dmytro.m',
    userReview:
      'Чудова платформа з великою кількістю якісних курсів. AI-помічник реально економить час!',
    stars: 5,
  },
  {
    id: 3,
    image: user03,
    userName: 'Олена М.',
    userNick: '@olena.m',
    userReview:
      'Найкраще рішення для тих, хто хоче розвиватися та отримувати нові знання щодня.',
    stars: 5,
  },
];

export const Review = () => (
  <Section>
    <Container>
      <OpenMore
        title="Що кажуть наші студенти"
        bttnTxt="Всі відгуки"
      />

      <Row>
        <Description>
          Досвід наших студентів підтверджує якість навчання.
          Дізнайтеся, як VEXA допомагає досягати нових цілей.
        </Description>

        <Cards>
          {cards.map((card) => (
            <ReviewCard
              card={card}
              key={card.id}
            />
          ))}
        </Cards>
      </Row>
    </Container>
  </Section>
);
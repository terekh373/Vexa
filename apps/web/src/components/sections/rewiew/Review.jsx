import styled from 'styled-components'
import { Container } from '../../layout/container/Container'
import { OpenMore } from '../../ui/openmore/OpenMore'
import { ReviewCard } from '../../ui/cards/main-page-review-card/ReviewCard'

import user01 from '../../../assets/images/user01.png'
import user02 from '../../../assets/images/user02.png'
import user03 from '../../../assets/images/user03.png'

const Section = styled.section`
  padding: 48px 0;

  @media (max-width: 960px) {
    padding: 28px 0;
  }

  @media (max-width: 540px) {
    padding: 26px 0;
  }
`

const Row = styled.div`
  display: flex;
  gap: 48px;
  align-items: center;
  padding: 10px;

  p {
    width: 222px;
    color: var(--main-dark-color);
    font-size: 16px;
    font-weight: 400;
    line-height: 24px;
  }

  @media (max-width: 960px) {
    flex-wrap: wrap;
    gap: 24px;
    padding: 0 44px;
  }

  @media (max-width: 540px) {
    flex-direction: column;
    align-items: stretch;
    align-items: center;
    gap: 32px;
    padding: 0;

    p {
      width: 100%;
    }
  }
`

// const [cards, setCards] = useState([])
// useEffect(() => {
//   fetch('/api/reviews')
//     .then(response => response.json())
//     .then(data => setCards(data))
// }, [])

const cards = [
  {
    id: 1,
    image: user01,
    userName: 'Інна Б.',
    userNick: '@inn.b',
    userReview: 'Зручна платформа, усе зрозуміло та легко знайти. Навчатися на VEXA справді комфортно.',
    stars: 5,
  },
  {
    id: 2,
    image: user02,
    userName: 'Дмитро М.',
    userNick: '@dmytro.m',
    userReview: 'Чудова платформа з великою кількістю якісних курсів. AI-помічник реально економить час!',
    stars: 5,
  },
  {
    id: 3,
    image: user03,
    userName: 'Олена М.',
    userNick: '@olena.m',
    userReview: 'Найкраще рішення для тих, хто хоче розвиватися та отримувати нові знання щодня.',
    stars: 5,
  },
]

export const Review = () => (
  <Section>
    <Container>
      <OpenMore title='Що кажуть наші студенти' bttnTxt='Всі відгуки' />
      <Row>
        <p>
          Досвід наших студентів підтверджує якість навчання. Дізнайтеся, як VEXA допомагає досягати нових цілей.
        </p>

        {cards.map((card) => (
          <ReviewCard card={card} key={card.id} />
        ))}
      </Row>
    </Container>
  </Section>
);
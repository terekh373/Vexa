import styled from 'styled-components'
import { Container } from '../../layout/container/Container.jsx'
import { Title } from './Title.jsx'
import { FeatureCard } from '../../ui/cards/feature-card/FeatureCard.jsx'

import icon01 from '../../../assets/icons/book.svg'
import icon02 from '../../../assets/icons/monitor.svg'
import icon03 from '../../../assets/icons/brain.svg'
import icon04 from '../../../assets/icons/certificate.svg'
import icon05 from '../../../assets/icons/headset.svg'

const Featurebox = styled.section`
  padding: 38px 0 8px 0;
  margin-bottom: 48px;
`

const Row = styled.div`
  display: flex;
  align-self: center;
  justify-content: space-between;
`

const cards = [
  {
    id: 1,
    image: icon01,
    title: 'Експертна база',
    description: 'Зібрали курси від досвідчених викладачів і практиків.'
  },
  {
    id: 2,
    image: icon02,
    title: 'Власний темп',
    description: 'Навчайтеся у зручний для себе час — вдома, на роботі чи в дорозі.'
  },
  {
    id: 3,
    image: icon03,
    title: 'AI-помічник',
    description: 'Навчайтеся ефективніше разом із персональним AI-помічником.'
  },
  {
    id: 4,
    image: icon04,
    title: 'Сертифікати',
    description: 'Завершуйте курси та отримуйте сертифікати.'
  },
  {
    id: 5,
    image: icon05,
    title: 'Супровід 24/7',
    description: 'Отримуйте підтримку та відповіді у будь-який час.'
  }
]

export const Features = () => (
  <Container>
    <Featurebox>
        <Title title='Чому Vexa?' />
        <Row>
          {cards.map((card) => (
            <FeatureCard card={card} />
          ))}
        </Row>
    </Featurebox> 
  </Container>
)


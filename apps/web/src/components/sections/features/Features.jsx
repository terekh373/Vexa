import styled from 'styled-components'
import { Container } from '../../layout/container/Container.jsx'
import { Title } from '../../ui/title/Title.jsx'
import { FeatureCard } from '../../ui/cards/feature-card/FeatureCard.jsx'

const Featurebox = styled.section`
  padding: 38px 0 8px 0;
  margin-bottom: 48px;
`

const Row = styled.div`
  display: flex;
  align-self: center;
  justify-content: space-between;

   @media (max-width: 960px) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 24px;
  }

  @media (max-width: 540px) {
    flex-direction: column;
    gap: 16px;
  }
`

export const Features = ({ cards = [] }) => (
  <Container>
    <Featurebox>
        <Title title='Чому Vexa?' size='large' />
        <Row>
          {cards.map((card) => (
            <FeatureCard card={card} variant='whyVexa' key={card.id} />
          ))}
        </Row>
    </Featurebox> 
  </Container>
);


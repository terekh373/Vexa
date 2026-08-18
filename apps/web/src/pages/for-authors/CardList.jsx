import styled from "styled-components"
import { FeatureCard } from "../../components/ui/cards/feature-card/FeatureCard"

const Container = styled.div`
  border: 2px solid green;
  display: flex;
  gap: 24px;
  flex-wrap: nowrap;
  align-items: center;
  margin-bottom: ${({ last, beforeLast }) => (last ? '0px' : beforeLast ? '40px' : '64px')};
`

export const CardList = ({ cards = [], variant, showArrow, last }) => (
  <Container last={last}>
   {cards.map((card, index) => (
    <FeatureCard key={card.id} card={card} variant={variant} showArrow={showArrow && index < cards.length - 1} />
   ))}
  </Container>
);
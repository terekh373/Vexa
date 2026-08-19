import styled from "styled-components"
import { FeatureCard } from "../../components/ui/cards/feature-card/FeatureCard"
import { AuthorsReviewCard } from '../../components/ui/cards/authors-review-card/AuthorsReviewCard.jsx'

const Container = styled.div`
  display: flex;
  gap: ${({ $review}) => ($review ? '32px' : '24px')};
  flex-wrap: nowrap;
  align-items: center;
  margin-bottom: ${({ $last, $beforeLast }) => ($last ? '0px' : $beforeLast ? '40px' : '64px')};
`

export const CardList = ({ cards = [], variant, showArrow, last, beforeLast, review }) => (
  <Container $last={last} $beforeLast={beforeLast} $review={review}>
   {cards.map((card, index) => (
    review  ? (
      <AuthorsReviewCard key={card.id} card={card} />
    ) : (
      <FeatureCard key={card.id} card={card} variant={variant} showArrow={showArrow && index < cards.length - 1} />
    )
   ))}
  </Container>
);
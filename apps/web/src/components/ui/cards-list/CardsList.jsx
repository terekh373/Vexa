import styled from "styled-components"
import { FeatureCard } from "../cards/feature-card/FeatureCard.jsx"
import { AuthorsReviewCard } from '../cards/authors-review-card/AuthorsReviewCard.jsx'
import { StudentsReviewCard } from "../cards/students-review-card/StudentsReviewCard.jsx"

const Container = styled.div`
  display: ${({ $review }) =>
    $review === 'studentReview' ? 'grid' : 'flex'};

  grid-template-columns: ${({ $review }) =>
    $review === 'studentReview' ? 'repeat(3, 1fr)' : 'none'};

  gap: ${({ $review }) => ($review ? '32px' : '24px')};

  align-items: center;

  margin-bottom: ${({ $last, $beforeLast }) =>
    $last ? '0px' : $beforeLast ? '40px' : '64px'};
`;

export const CardsList = ({ cards = [], variant, showArrow, last, beforeLast, review }) => (
  <Container $last={last} $beforeLast={beforeLast} $review={review}>
   {cards.map((card, index) => (
    review === 'authorReview' ? (
      <AuthorsReviewCard key={card.id} card={card} />
    ) 
    : review === 'studentReview' ? (
      <StudentsReviewCard key={card.id} card={card} />
    ) 
    : (
      <FeatureCard key={card.id} card={card} variant={variant} showArrow={showArrow && index < cards.length - 1} />
    )
   ))}
  </Container>
);
import styled from 'styled-components'

import { FeatureCard } from '../cards/feature-card/FeatureCard.jsx'
import { AuthorsReviewCard } from '../cards/authors-review-card/AuthorsReviewCard.jsx'
import { StudentsReviewCard } from '../cards/students-review-card/StudentsReviewCard.jsx'

const Container = styled.div`
  width: 100%;
  min-width: 0;
  display: ${({ $review }) => $review === 'studentReview' ? 'grid' : 'flex'};
  grid-template-columns: ${({ $review }) => $review === 'studentReview' ? 'repeat(3, minmax(0, 1fr))' : 'none'};
  gap: ${({ $variant, $review }) => {
    if ($variant === 'howItWorks') return '64px'
    if ($review) return '32px'
    return '24px'
  }};
  align-items: stretch;
  margin-bottom: ${({ $last, $beforeLast }) => $last ? '0' : $beforeLast ? '40px' : '64px'};

  > * {
    min-width: 0;
  }

  /* TABLET */
  @media (max-width: 1400px) {
    display: grid;
    grid-template-columns: ${({ $variant, $review }) => {
      if ($review) return 'repeat(2, minmax(0, 1fr))'
      if ($variant === 'whyBecomeAuthor') return 'repeat(3, minmax(0, 1fr))'
      if ($variant === 'howItWorks') return 'repeat(2, minmax(0, 1fr))'
      if ($variant === 'whatPublishing') return 'repeat(3, minmax(0, 1fr))'
      if ($variant === 'whatCanPublishing') return 'repeat(3, minmax(0, 1fr))'
      return 'repeat(2, minmax(0, 1fr))'
    }};
    gap: 24px;
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    margin-bottom: ${({ $last, $beforeLast }) => $last ? '0' : $beforeLast ? '32px' : '48px'};
  }

  /* MOBILE */
  @media (max-width: 540px) {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: ${({ $last, $beforeLast }) => $last ? '0' : $beforeLast ? '24px' : '40px'};
  }
`

export const CardsList = ({
  cards = [],
  variant,
  showArrow,
  last,
  beforeLast,
  review,
}) => (
  <Container
    $last={last}
    $beforeLast={beforeLast}
    $review={review}
    $variant={variant}
  >
    {cards.map((card, index) => (
      review === 'authorReview' ? (
        <AuthorsReviewCard
          key={card.id}
          card={card}
        />
      ) : review === 'studentReview' ? (
        <StudentsReviewCard
          key={card.id}
          card={card}
        />
      ) : (
        <FeatureCard
          key={card.id}
          card={card}
          variant={variant}
          showArrow={showArrow && index < cards.length - 1}
          index={index}
        />
      )
    ))}
  </Container>
);
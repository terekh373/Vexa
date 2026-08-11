import styled from 'styled-components'
import icon01 from '../../../../assets/icons/monitor.svg'

const Card = styled.div`
  width: 260px;
  padding: 8px 0 22px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  img {
    margin-bottom: 24px;
  }

  h4 {
    color: var(--main-dark-color);
    font-size: 20px;
    font-weight: 700;
    line-height: auto;
    letter-spacing: 0%;
    margin-bottom: 8px;
  }

  p {
    width: 174px;
    color: var(--secondary-grey);
    font-size: 16px;
    font-weight: 400;
    line-height: auto;
    letter-spacing: 0%;
  }
`

export const FeatureCard = ( {card} ) => (
  <Card>
    <img src={card.image} alt='monitor icon' />
    <h4>{card.title}</h4>
    <p>{card.description}</p>
  </Card>
)
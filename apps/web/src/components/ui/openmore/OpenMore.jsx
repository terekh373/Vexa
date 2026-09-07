import styled from 'styled-components'
import Button from '../../ui/buttons/Button'

import arrowRight from '../../../assets/icons/arrow-right.svg'
import arrowDown from '../../../assets/icons/arrow-down.svg'
import arrowUp from '../../../assets/icons/arrow-up.svg'


const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`

const Title = styled.h3`
  color: var(--main-dark-color);
  font-size: ${ ({ $size }) => 
    $size === 'small' ? '20px' : '40px'};
  font-weight: 700;
  line-height: ${ ({ $size }) => 
    $size === 'small' ? '24px' : '48px'};
  letter-spacing: 0%;

  @media (max-width: 960px) {
    font-size: ${ ({ $size }) => 
      $size === 'small' ? '20px' : '40px'};

    line-height: ${ ({ $size }) => 
    $size === 'small' ? '24px' : '40px'};
  }

  @media (max-width: 540px) {
    font-size: ${ ({ $size }) => 
      $size === 'small' ? '10px' : '20px'};

    line-height: ${ ({ $size }) => 
      $size === 'small' ? '12px' : '24px'};
  }
`

export const OpenMore = ({ title, bttnTxt, size='large', type = 'navigate', isOpen = false, onClick }) => (
    <Row>
        <Title $size={size}>{title}</Title>
        <Button 
          title={bttnTxt} 
          size='small' 
          variant='link' 
          icon={type === 'navigate' ? arrowRight : isOpen ? arrowUp : arrowDown } 
          onClick={onClick}
        />
    </Row>
);
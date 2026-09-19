import styled from 'styled-components'

const Label = styled.h3`
  color: var(--main-dark-color);
  font-size: ${ ({ $size }) => 
    $size === 'small' ? '20px' : '40px'};
  font-weight: 700;
  line-height: 48px;
  letter-spacing: 0%;
  margin-bottom: ${ ({$size}) =>
    $size === 'small' ? '32px' : '24px'};
`
export const Title = ({title, size}) => (
  <Label $size={size}>{title}</Label>
);
import styled from 'styled-components'

const Label = styled.h3`
  color: var(--main-dark-color);
  font-size: 40px;
  font-weight: 700;
  line-height: 48px;
  letter-spacing: 0%;
  margin-bottom: 24px;
`
export const Title = ({title}) => (
  <Label>{title}</Label>
)
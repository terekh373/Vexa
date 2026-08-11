import styled from 'styled-components'
// import { Container } from '../../layout/container/Container'
import Button from '../../ui/buttons/Button'

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`
const Title = styled.h3`
  color: var(--main-dark-color);
  font-size: 40px;
  font-weight: 700;
  line-height: 48px;
  letter-spacing: 0%;
`

export const OpenMore = ({title, bttnTxt}) => (
    <Row>
        <Title>{title}</Title>
        <Button title={bttnTxt} size='small' variant='link' />
    </Row>
)
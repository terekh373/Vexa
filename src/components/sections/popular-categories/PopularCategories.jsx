import styled from 'styled-components'
import { Container } from '../../layout/container/Container'
import Button from '../../ui/buttons/Button'

import { OpenMore } from '../../ui/openmore/OpenMore'

const Section = styled.section`
  padding: 48px 0;
  background: #F3EEFF;
`

const List = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
`

export const PopularCategories = () => (
  <Section>
    <Container>
      <OpenMore title='Популярні категорії' bttnTxt='Всі категорії' />

      <List>
        <Button title='Дизайн' size='small' variant='secondary-gray' />
        <Button title='Програмування' size='small' variant='secondary-gray' />
        <Button title='Підготовка до НМТ' size='small' variant='secondary-gray' />
        <Button title='Іноземні мови' size='small' variant='secondary-gray' />
        <Button title='Фото та відео' size='small' variant='secondary-gray' />
        <Button title='Творчість' size='small' variant='secondary-gray' />
        <Button title='Шкільні предмети' size='small' variant='secondary-gray' />
        <Button title='Маркетинг' size='small' variant='secondary-gray' />
        <Button title='Саморозвиток' size='small' variant='secondary-gray' />
        <Button title='Інше' size='small' variant='secondary-gray' />
      </List>
    </Container>
  </Section>
)
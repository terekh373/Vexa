import styled from 'styled-components'

const ContainerSize = styled.div`
  max-width: 1500px;
  width: 100%;
  margin: 0 auto; 
`
export const Container = ({ children }) => (
  <ContainerSize>
   {children}
  </ContainerSize>
);

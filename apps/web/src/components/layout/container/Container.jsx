import styled from 'styled-components'

const ContainerSize = styled.div`
  width: 100%;
  max-width: 1500px;
  margin: 0 auto; 
  box-sizing: border-box; 
  padding: 0 44px;

  @media (max-width: 960px) {
    padding: 0 32px;
  }

  @media (max-width: 540px) {
    padding: 0 32px;
  }
`
export const Container = ({ children }) => (
  <ContainerSize>
   {children}
  </ContainerSize>
);

// import { Link } from 'react-router-dom'

import styled from 'styled-components'
import logo from '../../../assets/icons/logo.svg'

const LogoWrapper = styled.div`
`;

export const Logo = () => (
  <LogoWrapper>
    <img src={logo} alt="vexa logo" />
  </LogoWrapper>
);
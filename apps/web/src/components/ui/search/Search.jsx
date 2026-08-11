import styled from 'styled-components';
import searchIcon from '../../../assets/icons/search.svg'

const SearchWrapper = styled.div`
  position: relative;
  max-width: 586px;
  min-width: 386px;
  padding: 10px;
  

  img {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
   }

  input {
    width: 100%;
    border: 1.5px solid #8A8F98;
    background: var(--main-bg-color);
    border-radius: 16px;
    padding: 10px 16px 10px 40px;
  
    font-size: 16px;
    outline: none;
    outline: none;
    color: var(--main-dark-color);
  }
`;


export const Search = ({ type='text', placeholder = 'Пошук курсів...', onKeyDown, onChange, required} ) => (
  <SearchWrapper>
    <img src={searchIcon} alt='search icon'/>
    <input type={type}
           placeholder={placeholder}
           onKeyDown={() => {}}
           onChange={onChange}
           required={required}
    />
  </SearchWrapper>
)
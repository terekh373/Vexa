import styled from 'styled-components';
import searchIcon from '../../../assets/icons/search.svg'

const SearchWrapper = styled.div`
  position: relative;
  width: 100%;
  /* padding: 10px;  */

  ${({ $size}) => {
    if($size === 'medium') {
      return `
        width: 586px;
        width: 586px;

        input {
          padding: 10px 16px 10px 40px;
          font-size: 16px;
        }
      `;
    }

    if ($size === 'large') {
      return `
        max-width: 1190px;

        input {
          padding: 10px 16px 10px 40px;
          font-size: 16px;
        }
      `;
    }
  }}
  
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
    outline: none;
    color: var(--main-dark-color);
  }

  @media (max-width: 992px) {
    max-width: 100%;
    min-width: 0;
  }

  @media (max-width: 480px) {
    padding: 8px;

    input {
      font-size: 14px;
      padding: 9px 12px 9px 36px;
    }

    img {
      left: 14px;
      width: 16px;
      height: 16px;
    }
  }
  
  @media (max-width: 320px) {
    padding: 6px;

    input {
      font-size: 14px;
      padding: 8px 10px 8px 34px;
    }

    img {
      left: 12px;
    }
  }
`;


export const Search = ({ size='medium', type='text', value='', placeholder = 'Пошук курсів...', onKeyDown, onChange, required} ) => (
  <SearchWrapper $size={size}>
    <img src={searchIcon} alt='search icon'/>
    <input type={type}
           placeholder={placeholder}
           value={value}
           onKeyDown={() => {}}
           onChange={onChange}
           required={required}
    />
  </SearchWrapper>
)
import styled from 'styled-components';

import searchIcon from '../../../assets/icons/search.svg';

const SearchWrapper = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;

  ${({ $size }) => {
    if ($size === 'medium') {
      return `
        max-width: 586px;
        height: 46px;
      `;
    }

    if ($size === 'large') {
      return `
        max-width: 1216px;
        height: 48px;
      `;
    }

    return '';
  }}

  img {
    position: absolute;
    z-index: 1;
    top: 50%;
    left: 16px;
    width: 18px;
    height: 18px;
    display: block;
    transform: translateY(-50%);
    pointer-events: none;
  }

  input {
    display: block;
    width: 100%;
    height: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 0 16px 0 44px;
    border: 1.5px solid var(--secondary-grey);
    border-radius: 16px;
    background: var(--main-bg-color);
    color: var(--main-dark-color);
    font-family: inherit;
    font-size: 16px;
    line-height: 24px;
    outline: none;
  }

  input::placeholder {
    color: var(--secondary-grey);
    opacity: 1;
  }

  input:focus {
    border-color: var(--purple-color);
  }

  @media (max-width: 1100px) {
    width: 100%;
    max-width: 100%;
    height: 44px;

    img {
      left: 14px;
      width: 16px;
      height: 16px;
    }

    input {
      width: 100%;
      height: 100%;
      padding: 0 14px 0 40px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 20px;
    }
  }

  @media (max-width: 540px) {
    height: 42px;

    img {
      left: 12px;
      width: 16px;
      height: 16px;
    }

    input {
      padding: 0 12px 0 38px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 20px;
    }
  }

  @media (max-width: 360px) {
    height: 40px;

    img {
      left: 12px;
      width: 15px;
      height: 15px;
    }

    input {
      padding: 0 10px 0 36px;
      font-size: 13px;
      line-height: 18px;
    }
  }
`;

export const Search = ({
  size = 'medium',
  type = 'text',
  value,
  placeholder = 'Пошук курсів...',
  onKeyDown,
  onChange,
  required,
}) => (
  <SearchWrapper $size={size}>
    <img
      src={searchIcon}
      alt=""
      aria-hidden="true"
    />

    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onKeyDown={onKeyDown}
      onChange={onChange}
      required={required}
    />
  </SearchWrapper>
);
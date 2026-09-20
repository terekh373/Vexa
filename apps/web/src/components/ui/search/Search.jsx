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

        input {
          padding: 10px 16px 10px 40px;
          font-size: 16px;
          line-height: 24px;
        }
      `;
    }

    if ($size === 'large') {
      return `
        max-width: 1216px;

        input {
          padding: 12px 16px 12px 40px;
          font-size: 16px;
          line-height: 24px;
        }
      `;
    }
  }}

  img {
    position: absolute;
    top: 50%;
    left: 16px;
    width: 18px;
    height: 18px;
    transform: translateY(-50%);
    pointer-events: none;
  }

  input {
    display: block;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    border: 1.5px solid #8a8f98;
    border-radius: 16px;
    background: var(--main-bg-color);
    color: var(--main-dark-color);
    outline: none;
  }

  input:focus {
    border-color: var(--purple-color);
  }

  /* TABLET */
  @media (max-width: 1100px) {
    width: 100%;
    max-width: 100%;

    input {
      width: 100%;
      padding: 10px 14px 10px 40px;
      font-size: 15px;
      line-height: 22px;
    }

    img {
      left: 14px;
      width: 18px;
      height: 18px;
    }
  }

  /* MOBILE */
  @media (max-width: 540px) {
    width: 100%;
    max-width: 100%;

    input {
      padding: 10px 14px 10px 38px;
      font-size: 14px;
      line-height: 20px;
      border-radius: 12px;
    }

    img {
      left: 14px;
      width: 16px;
      height: 16px;
    }
  }

  @media (max-width: 360px) {
    input {
      padding: 9px 12px 9px 36px;
      font-size: 14px;
      line-height: 20px;
    }

    img {
      left: 12px;
      width: 16px;
      height: 16px;
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
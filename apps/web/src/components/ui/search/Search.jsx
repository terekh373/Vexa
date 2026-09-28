import { useEffect, useId, useState } from 'react';
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

  > img {
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

    > img {
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

    > img {
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

    > img {
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

const Suggestions = styled.ul`
  position: absolute;
  z-index: 120;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 320px;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--border-grey);
  border-radius: 14px;
  background: var(--white-color);
  box-shadow: 0 16px 34px rgba(36, 22, 79, 0.16);
`;

const SuggestionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: ${({ $active }) => ($active ? 'var(--footer-bg-color)' : 'transparent')};
  color: var(--main-dark-color);
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--footer-bg-color);
  }

  span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span:last-child {
    flex: none;
    color: var(--secondary-grey);
    font-size: 12px;
  }
`;

export const Search = ({
  size = 'medium',
  type = 'text',
  value,
  placeholder = 'Пошук курсів...',
  onKeyDown,
  onChange,
  onSuggestionSelect,
  suggestions = [],
  required,
}) => {
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions, value]);

  const selectSuggestion = (suggestion) => {
    setIsOpen(false);
    setActiveIndex(-1);
    onSuggestionSelect?.(suggestion);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    onKeyDown?.(event);
  };

  return (
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
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          setIsOpen(true);
          onChange?.(event);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 100)}
        required={required}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
      />

      {isOpen && suggestions.length > 0 && (
        <Suggestions id={listboxId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.type}-${suggestion.id}`}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <SuggestionButton
                type="button"
                $active={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
              >
                <span>{suggestion.title}</span>
                <span>{suggestion.type === 'material' ? 'Матеріал' : 'Курс'}</span>
              </SuggestionButton>
            </li>
          ))}
        </Suggestions>
      )}
    </SearchWrapper>
  );
};

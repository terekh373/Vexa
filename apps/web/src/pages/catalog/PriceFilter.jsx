import { useState } from 'react';
import styles from './PriceFilter.module.css';

export const MIN_CATALOG_PRICE = 0;
export const MAX_CATALOG_PRICE = 5000;

const PriceFilter = ({ minPrice, maxPrice, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMinChange = (event) => {
    const value = Number(event.target.value);

    if (value > maxPrice) {
      return;
    }

    onChange({ min: value, max: maxPrice });
  };

  const handleMaxChange = (event) => {
    const value = Number(event.target.value);

    if (value < minPrice) {
      return;
    }

    onChange({ min: minPrice, max: value });
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Ціна</span>
        <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.slider}>
            <div className={styles.track} />

            <div
              className={styles.range}
              style={{
                left: `${(minPrice / MAX_CATALOG_PRICE) * 100}%`,
                right: `${100 - (maxPrice / MAX_CATALOG_PRICE) * 100}%`,
              }}
            />

            <input
              type="range"
              min={MIN_CATALOG_PRICE}
              max={MAX_CATALOG_PRICE}
              value={minPrice}
              onChange={handleMinChange}
              className={styles.rangeInput}
              aria-label="Мінімальна ціна"
            />

            <input
              type="range"
              min={MIN_CATALOG_PRICE}
              max={MAX_CATALOG_PRICE}
              value={maxPrice}
              onChange={handleMaxChange}
              className={styles.rangeInput}
              aria-label="Максимальна ціна"
            />
          </div>

          <p className={styles.price}>
            Від {minPrice.toLocaleString('uk-UA')} до{' '}
            {maxPrice.toLocaleString('uk-UA')} ₴
          </p>
        </div>
      )}
    </div>
  );
};

export default PriceFilter;

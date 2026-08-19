import { useState } from 'react'
import styles from './PriceFilter.module.css'
import checkIcon from '../../assets/icons/check.svg'

const MIN_PRICE = 0
const MAX_PRICE = 500

const PriceFilter = ({
  minPrice,
  maxPrice,
  onChange,
  free,
  discounted,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleMinChange = (event) => {
    const value = Number(event.target.value)

    if (value > maxPrice) {
      return
    }

    onChange({
      min: value,
      max: maxPrice,
    })
  }

  const handleMaxChange = (event) => {
    const value = Number(event.target.value)

    if (value < minPrice) {
      return
    }

    onChange({
      min: minPrice,
      max: value,
    })
  }

  const handleCheckboxChange = (name, checked) => {
    onChange({
      min: minPrice,
      max: maxPrice,
      [name]: checked,
    })
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Ціна</span>

        <span
          className={`${styles.arrow} ${
            isOpen ? styles.arrowUp : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>

          {/* PRICE SLIDER */}

          <div className={styles.slider}>
            <div className={styles.track} />

            <div
              className={styles.range}
              style={{
                left: `${(minPrice / MAX_PRICE) * 100}%`,
                right: `${100 - (maxPrice / MAX_PRICE) * 100}%`,
              }}
            />

            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              value={minPrice}
              onChange={handleMinChange}
              className={styles.rangeInput}
            />

            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              value={maxPrice}
              onChange={handleMaxChange}
              className={styles.rangeInput}
            />
          </div>

          <p className={styles.price}>
            Від {minPrice.toLocaleString('uk-UA')} до{' '}
            {maxPrice.toLocaleString('uk-UA')} ₴
          </p>

          {/* CHECKBOXES */}

          <div className={styles.checkboxes}>

            <label className={styles.option}>
              <div className={styles.checkboxWrapper}>
                <input
                  type="checkbox"
                  checked={free}
                  onChange={(event) =>
                    handleCheckboxChange(
                      'free',
                      event.target.checked
                    )
                  }
                />

                <span className={styles.checkbox}>
                  {free && (
                    <img
                      src={checkIcon}
                      alt=""
                    />
                  )}
                </span>
              </div>

              <span>Безкоштовні</span>
            </label>

            <label className={styles.option}>
              <div className={styles.checkboxWrapper}>
                <input
                  type="checkbox"
                  checked={discounted}
                  onChange={(event) =>
                    handleCheckboxChange(
                      'discounted',
                      event.target.checked
                    )
                  }
                />

                <span className={styles.checkbox}>
                  {discounted && (
                    <img
                      src={checkIcon}
                      alt=""
                    />
                  )}
                </span>
              </div>

              <span>Зі знижкою</span>
            </label>

          </div>
        </div>
      )}
    </div>
  )
}

export default PriceFilter;
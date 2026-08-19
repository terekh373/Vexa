import { useState } from 'react';
import styles from './FilterDropdown.module.css';
import starIcon from '../../../assets/icons/star-purple.svg'
import starGreyIcon from '../../../assets/icons/star-grey.svg'
import checkIcon from '../../../assets/icons/check.svg';

const FilterDropdown = ({ label, options, value, onChange, type = 'default' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (e) => {
    const selectedValue = e.target.value;

    if (value.includes(selectedValue)) {
      // убираем значение, если чекбокс уже выбран
      onChange(value.filter((item) => item !== selectedValue));
    }
    else {
      // добавляем значение
      onChange([...value, selectedValue]);
    }
  }

  return (
    <div className={styles.wrapper}>
      <button  
        type='button'
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        > {label}
          <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`}></span>
        </button>

        {isOpen && (
          <div className={styles.dropdown}>
            {options.map((option) => (
              <label key={option.value} className={styles.option}>
                <div className={styles.box}>
                  <div className={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={value.includes(option.value)}
                      onChange={handleChange}
                    />

                    <span className={styles.checkbox}>
                      {value.includes(option.value) && (
                        <img src={checkIcon} alt="" />
                      )}
                    </span>
                  </div>

                  {type === 'rating' ? (
                    <div className={styles.stars}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <img
                          key={index}
                          src={index < Number(option.value) ? starIcon : starGreyIcon}
                          className={styles.star}
                          alt=""
                        />
                      ))}
                    </div>
                  ) : (
                    <span>{option.label}</span>
                  )}
                </div>
                
                <span className={styles.count}>{option.count}</span>
              </label>
            ))}
          </div>
        )}
    </div>
  )
}

export default FilterDropdown;
import { useState } from 'react';
import styles from './FilterDropdown.module.css';
import starIcon from '../../../assets/icons/star-purple.svg';
import starGreyIcon from '../../../assets/icons/star-grey.svg';
import checkIcon from '../../../assets/icons/check.svg';

const FilterDropdown = ({ label, options, value, onChange, type = 'default' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (event) => {
    const selectedValue = event.target.value;
    onChange(value === selectedValue ? '' : selectedValue);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
        <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {options.map((option) => {
            const isChecked = value === option.value;

            return (
              <label key={option.value} className={styles.option}>
                <div className={styles.box}>
                  <div className={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={isChecked}
                      onChange={handleChange}
                    />

                    <span className={styles.checkbox}>
                      {isChecked && <img src={checkIcon} alt="" />}
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
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;

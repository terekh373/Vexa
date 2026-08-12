import { useState } from 'react';
import styles from './FilterDropdown.module.css';

const FilterDropdown = ({ label, options, value, onChange }) => {
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
                  <input
                    type='checkbox'
                    value={option.value}
                    checked={value.includes(option.value)}
                    onChange={handleChange} 
                  />
                  <span>{option.label}</span>
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
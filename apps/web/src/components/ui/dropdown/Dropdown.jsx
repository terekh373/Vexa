import styles from './Dropdown.module.css'
import arrowDown from '../../../assets/icons/arrow-down.svg'

const Dropdown = ({ label, options = [], value, onChange}) => {
  return (
    <div className={styles.wrapper}>
      <label htmlFor='dropdown' className={styles.label}>{label}</label>

      <select 
        id='dropdown'
        className={styles.select}
        style={{ backgroundImage: `url(${arrowDown})` }}
        value={value}
        onChange={onChange}
      >
        <option value='' className={styles.option}>Оберіть категорію</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

export default Dropdown;
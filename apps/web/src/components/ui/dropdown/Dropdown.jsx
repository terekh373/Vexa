import styles from './Dropdown.module.css'

const Dropdown = ({ label, options = [], value, onChange}) => {
  return (
    <div className={styles.wrapper}>
      <label htmlFor='dropdown' className={styles.label}>{label}</label>

      <select 
        id='dropdown'
        className={styles.select}
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
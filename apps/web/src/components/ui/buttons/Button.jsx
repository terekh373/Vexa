import styles from './Button.module.css'

const Button = ({ title, onClick, variant='primary', size='medium', type='button', icon}) => {
  return (
    <button onClick={onClick}
            className={`${styles.button} ${styles[variant]} ${styles[size]}`}
            type={type}
    >
      {title}

       {icon && (
          <img src={icon} alt="button icon" aria-hidden="true" />
      )}
    </button>
  )
}

export default Button;
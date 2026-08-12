import styles from './Button.module.css'
import arrowRight from '../../../assets/icons/arrow-right.svg'

const Button = ({ title, onClick, variant='primary', size='medium', type='button' }) => {
  return (
    <button onClick={onClick}
            className={`${styles.button} ${styles[variant]} ${styles[size]}`}
            type={type}
    >
      {title}

      {variant === 'link' && (
          <img src={arrowRight} alt="" aria-hidden="true" />
      )}
    </button>
  )
}

export default Button;
import styles from './Button.module.css';

const Button = ({
  title,
  onClick,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  icon,
  disabled = false,
}) => (
  <button
    onClick={onClick}
    className={`${styles.button} ${styles[variant]} ${styles[size]}`}
    type={type}
    disabled={disabled}
  >
    {title}

    {icon && (
      <img src={icon} alt="" aria-hidden="true" />
    )}
  </button>
);

export default Button;

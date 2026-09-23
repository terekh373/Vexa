import { useEffect } from 'react';

import styles from './Toast.module.css';

const Toast = ({
  message,
  type = 'success',
  duration = 13000,
  onClose,
}) => {
  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      className={`${styles.toast} ${styles[type]}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.icon}>
        {type === 'success' ? '✓' : '!'}
      </div>

      <span className={styles.message}>{message}</span>

      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Закрити повідомлення"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
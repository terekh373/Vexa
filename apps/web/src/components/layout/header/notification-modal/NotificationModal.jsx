import BellIcon from '../../../../assets/icons/bell.svg';

import styles from './NotificationModal.module.css';

const NotificationModal = ({ onClose }) => {
  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Закрити"
        >
          ×
        </button>

        <div className={styles.icon}>
          <img
            className={styles.bell}
            src={BellIcon}
            alt=""
            aria-hidden="true"
          />
        </div>

        <h2
          id="notification-modal-title"
          className={styles.title}
        >
          Повідомлення
        </h2>

        <p className={styles.text}>
          Цей розділ ще в розробці.
          Незабаром тут зʼявляться ваші повідомлення.
        </p>

        <button
          type="button"
          className={styles.button}
          onClick={onClose}
        >
          Зрозуміло
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;
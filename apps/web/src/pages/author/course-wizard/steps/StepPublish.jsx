import styles from '../CourseWizard.module.css';

const STATUS_LABELS = {
  draft: 'Чернетка',
  moderation: 'На модерації',
  published: 'Опубліковано',
  rejected: 'Відхилено',
  unpublished: 'Знято з публікації',
};

const StepPublish = ({
  formState,
  categoryName,
  status,
  isReadOnly,
  submitting,
  submitError,
  submitMessage,
  onSubmit,
}) => {
  const priceLabel = Number(formState.priceUah) > 0 ? `${formState.priceUah} грн` : 'Безкоштовно';

  return (
    <div className={styles.form}>
      <span className={styles.statusBadge}>{STATUS_LABELS[status] ?? status}</span>

      <ul className={styles.summaryList}>
        <li className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Назва</span>
          <span>{formState.title || '—'}</span>
        </li>
        <li className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Тип</span>
          <span>{formState.type === 'MATERIAL' ? 'Матеріал' : 'Курс'}</span>
        </li>
        <li className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Категорія</span>
          <span>{categoryName || '—'}</span>
        </li>
        <li className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Ціна</span>
          <span>{priceLabel}</span>
        </li>
      </ul>

      {submitMessage && <p className={styles.success}>{submitMessage}</p>}
      {submitError && <p className={styles.formError}>{submitError}</p>}

      {!isReadOnly && (
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? 'Надсилаємо...' : 'Подати на модерацію'}
        </button>
      )}
    </div>
  );
};

export default StepPublish;

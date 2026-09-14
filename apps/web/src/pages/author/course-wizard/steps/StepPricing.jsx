import styles from '../CourseWizard.module.css';

const StepPricing = ({ formState, onChange, fieldErrors, readOnly }) => {
  const handleChange = (event) => {
    onChange('priceUah', event.target.value);
  };

  return (
    <div className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Ціна, грн</span>
        <div className={styles.priceField}>
          <input
            className={`${styles.input} ${fieldErrors.priceAmount ? styles.inputError : ''}`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={formState.priceUah}
            onChange={handleChange}
            disabled={readOnly}
            aria-invalid={Boolean(fieldErrors.priceAmount)}
          />
        </div>
        <p className={styles.priceHint}>0 грн означає «безкоштовно».</p>
        {fieldErrors.priceAmount && <span className={styles.error}>{fieldErrors.priceAmount}</span>}
      </label>
    </div>
  );
};

export default StepPricing;

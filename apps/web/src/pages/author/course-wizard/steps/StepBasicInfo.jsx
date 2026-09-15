import styles from '../CourseWizard.module.css';
import CoverField from './CoverField.jsx';

const SHORT_DESCRIPTION_LIMIT = 400;
const GRADES = Array.from({ length: 11 }, (_, index) => index + 1);

const renderCategoryOptions = (categories) =>
  categories.map((node) => {
    if (node.children?.length) {
      return (
        <optgroup key={node.id} label={node.nameUk}>
          {node.children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.nameUk}
            </option>
          ))}
        </optgroup>
      );
    }

    return (
      <option key={node.id} value={node.id}>
        {node.nameUk}
      </option>
    );
  });

const StepBasicInfo = ({
  formState,
  onChange,
  onOutcomeChange,
  onAddOutcome,
  onRemoveOutcome,
  categories,
  categoriesError,
  fieldErrors,
  readOnly,
  coverName,
  coverPreviewUrl,
  coverUploadDisabled,
  coverUploadDisabledHint,
  onCoverUploaded,
}) => {
  const handleField = (event) => {
    const { name, value } = event.target;
    onChange(name, value);
  };

  return (
    <div className={styles.form}>
      <CoverField
        coverName={coverName}
        initialPreviewUrl={coverPreviewUrl}
        disabled={coverUploadDisabled}
        disabledHint={coverUploadDisabledHint}
        onUploaded={onCoverUploaded}
      />

      <label className={styles.field}>
        <span className={styles.label}>Тип</span>
        <select
          className={styles.select}
          name="type"
          value={formState.type}
          onChange={handleField}
          disabled={readOnly}
        >
          <option value="COURSE">Курс</option>
          <option value="MATERIAL">Матеріал</option>
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Назва</span>
        <input
          className={`${styles.input} ${fieldErrors.title ? styles.inputError : ''}`}
          name="title"
          value={formState.title}
          onChange={handleField}
          disabled={readOnly}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title && <span className={styles.error}>{fieldErrors.title}</span>}
      </label>

      <label className={styles.field}>
        <div className={styles.labelRow}>
          <span className={styles.label}>Короткий опис</span>
          <span className={styles.counter}>
            {formState.shortDescription.length}/{SHORT_DESCRIPTION_LIMIT}
          </span>
        </div>
        <textarea
          className={`${styles.textarea} ${fieldErrors.shortDescription ? styles.inputError : ''}`}
          name="shortDescription"
          value={formState.shortDescription}
          onChange={handleField}
          maxLength={SHORT_DESCRIPTION_LIMIT}
          disabled={readOnly}
          aria-invalid={Boolean(fieldErrors.shortDescription)}
        />
        {fieldErrors.shortDescription && (
          <span className={styles.error}>{fieldErrors.shortDescription}</span>
        )}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Повний опис</span>
        <textarea
          className={`${styles.textarea} ${fieldErrors.description ? styles.inputError : ''}`}
          name="description"
          value={formState.description}
          onChange={handleField}
          disabled={readOnly}
          aria-invalid={Boolean(fieldErrors.description)}
        />
        {fieldErrors.description && <span className={styles.error}>{fieldErrors.description}</span>}
      </label>

      <div className={styles.field}>
        <span className={styles.label}>Результати навчання</span>
        <div className={styles.outcomesList}>
          {formState.outcomes.map((outcome, index) => (
            <div className={styles.outcomeRow} key={index}>
              <input
                className={styles.input}
                value={outcome}
                onChange={(event) => onOutcomeChange(index, event.target.value)}
                disabled={readOnly}
                placeholder="Наприклад: розв’язувати квадратні рівняння"
              />
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => onRemoveOutcome(index)}
                disabled={readOnly || formState.outcomes.length <= 1}
                aria-label="Видалити результат"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={onAddOutcome}
          disabled={readOnly}
        >
          + Додати результат
        </button>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Категорія</span>
        <select
          className={`${styles.select} ${fieldErrors.categoryId ? styles.inputError : ''}`}
          name="categoryId"
          value={formState.categoryId}
          onChange={handleField}
          disabled={readOnly}
          aria-invalid={Boolean(fieldErrors.categoryId)}
        >
          <option value="">Оберіть категорію</option>
          {renderCategoryOptions(categories)}
        </select>
        {fieldErrors.categoryId && <span className={styles.error}>{fieldErrors.categoryId}</span>}
        {categoriesError && <span className={styles.error}>{categoriesError}</span>}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Клас</span>
        <select
          className={styles.select}
          name="grade"
          value={formState.grade}
          onChange={handleField}
          disabled={readOnly}
        >
          <option value="">Не прив’язано</option>
          {GRADES.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Мова</span>
        <select
          className={styles.select}
          name="language"
          value={formState.language}
          onChange={handleField}
          disabled={readOnly}
        >
          <option value="uk">Українська</option>
          <option value="en">Англійська</option>
        </select>
      </label>
    </div>
  );
};

export default StepBasicInfo;

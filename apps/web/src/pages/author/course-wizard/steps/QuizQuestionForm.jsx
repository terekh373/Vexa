import { useId, useState } from 'react';

import styles from '../CourseWizard.module.css';
import { QUESTION_TYPE_LABELS, validateQuestionDraft } from '../quizValidation.js';

let addedOptionCounter = 0;

const QuizQuestionForm = ({ initialDraft, saving, onSave, onCancel }) => {
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState('');
  const groupName = useId();

  const handleType = (type) => {
    setDraft((current) => {
      if (type !== 'SINGLE') return { ...current, type };

      // A single-answer question keeps only the first marked option.
      let kept = false;
      const options = current.options.map((option) => {
        if (!option.isCorrect || kept) return { ...option, isCorrect: false };
        kept = true;
        return option;
      });
      return { ...current, type, options };
    });
  };

  const handleOptionText = (key, text) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option) => (option.key === key ? { ...option, text } : option)),
    }));
  };

  const handleOptionCorrect = (key, checked) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option) => {
        if (option.key === key) return { ...option, isCorrect: checked };
        return current.type === 'SINGLE' ? { ...option, isCorrect: false } : option;
      }),
    }));
  };

  const handleAddOption = () => {
    // The prefix differs from the draft-N keys made in quizValidation.js, so keys never collide.
    const key = `added-${addedOptionCounter}`;
    addedOptionCounter += 1;
    setDraft((current) => ({
      ...current,
      options: [...current.options, { key, text: '', isCorrect: false }],
    }));
  };

  const handleRemoveOption = (key) => {
    setDraft((current) => ({
      ...current,
      options: current.options.filter((option) => option.key !== key),
    }));
  };

  const handleSave = () => {
    const message = validateQuestionDraft(draft);
    setError(message ?? '');
    if (message) return;
    onSave(draft);
  };

  return (
    <div className={styles.quizQuestionForm}>
      <label className={styles.field}>
        <span className={styles.label}>Текст питання</span>
        <textarea
          className={styles.textarea}
          value={draft.text}
          onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
          disabled={saving}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Тип питання</span>
        <select
          className={styles.select}
          value={draft.type}
          onChange={(event) => handleType(event.target.value)}
          disabled={saving}
        >
          {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.outcomesList}>
        {draft.options.map((option, index) => (
          <div key={option.key} className={styles.quizOptionRow}>
            <input
              type={draft.type === 'SINGLE' ? 'radio' : 'checkbox'}
              name={groupName}
              checked={option.isCorrect}
              onChange={(event) => handleOptionCorrect(option.key, event.target.checked)}
              disabled={saving}
              aria-label={`Правильний варіант ${index + 1}`}
            />
            <input
              className={styles.input}
              value={option.text}
              onChange={(event) => handleOptionText(option.key, event.target.value)}
              disabled={saving}
              aria-label={`Варіант ${index + 1}`}
            />
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => handleRemoveOption(option.key)}
              disabled={saving || draft.options.length <= 2}
              aria-label="Видалити варіант"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={`${styles.button} ${styles.buttonSecondary}`}
        onClick={handleAddOption}
        disabled={saving}
      >
        + Додати варіант
      </button>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.quizFormActions}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Зберігаємо...' : 'Зберегти питання'}
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={onCancel}
          disabled={saving}
        >
          Скасувати
        </button>
      </div>
    </div>
  );
};

export default QuizQuestionForm;

import { useEffect, useState } from 'react';

import {
  createLessonQuiz,
  createQuizQuestion,
  deleteQuizQuestion,
  updateQuiz,
  updateQuizQuestion,
} from '../../../../services/authorQuizService.js';
import styles from '../CourseWizard.module.css';
import {
  QUESTION_TYPE_LABELS,
  emptyQuestionDraft,
  toQuestionDraft,
  toQuestionPayload,
  toQuizSettingsPayload,
  validateQuizSettings,
} from '../quizValidation.js';

import QuizQuestionForm from './QuizQuestionForm.jsx';

const toSettingsRows = (passScore, attemptsAllowed) => ({
  passScore: passScore == null ? '' : String(passScore),
  attemptsAllowed: attemptsAllowed == null ? '' : String(attemptsAllowed),
});

const failureMessage = (error, fallback) =>
  error.response?.status === 409 ? 'Курс зараз не можна редагувати.' : fallback;

const LessonQuizEditor = ({ lesson, readOnly, onChanged }) => {
  const quiz = lesson.quiz ?? null;
  const questions = quiz?.questions ?? [];
  const savedPassScore = quiz?.passScore;
  const savedAttempts = quiz?.attemptsAllowed;

  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settings, setSettings] = useState(() => toSettingsRows(savedPassScore, savedAttempts));
  const [settingsErrors, setSettingsErrors] = useState({});

  useEffect(() => {
    setSettings(toSettingsRows(savedPassScore, savedAttempts));
    setSettingsErrors({});
  }, [savedPassScore, savedAttempts]);

  // Every operation clears old messages and locks the buttons while it runs.
  const run = async (operation, fallback) => {
    setError('');
    setSettingsMessage('');
    setBusy(true);
    try {
      await operation();
      return true;
    } catch (caught) {
      setError(failureMessage(caught, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleCreateQuiz = () =>
    run(async () => {
      await createLessonQuiz(lesson.id, {});
      await onChanged();
    }, 'Не вдалося створити тест.');

  const handleSaveSettings = async () => {
    const errors = validateQuizSettings(settings);
    setSettingsErrors(errors);
    setError('');
    setSettingsMessage('');
    if (Object.keys(errors).length > 0) return;

    const next = toQuizSettingsPayload(settings);
    const patch = {};
    if (next.passScore !== quiz.passScore) patch.passScore = next.passScore;
    if (next.attemptsAllowed !== quiz.attemptsAllowed) patch.attemptsAllowed = next.attemptsAllowed;

    if (Object.keys(patch).length === 0) {
      setSettingsMessage('Немає змін для збереження.');
      return;
    }

    const ok = await run(async () => {
      await updateQuiz(quiz.id, patch);
      await onChanged();
    }, 'Не вдалося зберегти налаштування тесту.');
    if (ok) setSettingsMessage('Налаштування збережено.');
  };

  const handleSaveQuestion = async (draft) => {
    const ok = await run(async () => {
      if (editingId === 'new') {
        await createQuizQuestion(quiz.id, { ...toQuestionPayload(draft), sortOrder: questions.length });
      } else {
        await updateQuizQuestion(editingId, toQuestionPayload(draft));
      }
      await onChanged();
    }, 'Не вдалося зберегти питання. Перевірте поля й спробуйте ще раз.');
    if (ok) setEditingId(null);
  };

  const handleDeleteQuestion = (question) => {
    const confirmed = window.confirm(`Видалити питання «${question.text.slice(0, 60)}»?`);
    if (!confirmed) return;

    run(async () => {
      await deleteQuizQuestion(question.id);
      await onChanged();
    }, 'Не вдалося видалити питання.');
  };

  const handleMove = (index, direction) => {
    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index + direction, 0, moved);

    run(async () => {
      try {
        await Promise.all(
          reordered
            .map((question, position) => ({ question, position }))
            .filter(({ question, position }) => question.id !== questions[position].id)
            .map(({ question, position }) => updateQuizQuestion(question.id, { sortOrder: position })),
        );
      } finally {
        // Also after a partial failure, so the screen matches the server.
        await onChanged();
      }
    }, 'Не вдалося змінити порядок питань.');
  };

  if (!quiz) {
    if (readOnly) return <p className={styles.placeholder}>Тест не створено.</p>;

    return (
      <div className={styles.quizEditor}>
        {error && <p className={styles.formError}>{error}</p>}
        <p className={styles.placeholder}>Для цього уроку ще немає тесту.</p>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleCreateQuiz}
          disabled={busy}
        >
          Створити тест
        </button>
      </div>
    );
  }

  return (
    <div className={styles.quizEditor}>
      {readOnly ? (
        <p className={styles.placeholder}>
          Прохідний бал: {quiz.passScore}%.{' '}
          {quiz.attemptsAllowed == null ? 'Спроб: без обмежень' : `Спроб: ${quiz.attemptsAllowed}`}
        </p>
      ) : (
        <div className={styles.quizSettings}>
          <label className={styles.field}>
            <span className={styles.label}>Прохідний бал, %</span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              className={`${styles.input} ${settingsErrors.passScore ? styles.inputError : ''}`}
              value={settings.passScore}
              onChange={(event) => setSettings((current) => ({ ...current, passScore: event.target.value }))}
              disabled={busy}
            />
            {settingsErrors.passScore && <span className={styles.error}>{settingsErrors.passScore}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Кількість спроб</span>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Без обмежень"
              className={`${styles.input} ${settingsErrors.attemptsAllowed ? styles.inputError : ''}`}
              value={settings.attemptsAllowed}
              onChange={(event) =>
                setSettings((current) => ({ ...current, attemptsAllowed: event.target.value }))
              }
              disabled={busy}
            />
            {settingsErrors.attemptsAllowed && (
              <span className={styles.error}>{settingsErrors.attemptsAllowed}</span>
            )}
          </label>

          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleSaveSettings}
            disabled={busy}
          >
            Зберегти налаштування
          </button>
          {settingsMessage && <p className={styles.success}>{settingsMessage}</p>}
        </div>
      )}

      {error && <p className={styles.formError}>{error}</p>}

      {questions.length === 0 && (
        <p className={styles.placeholder}>
          Питань ще немає. Урок-тест можна подати на модерацію, коли в ньому є хоча б одне питання з
          правильною відповіддю.
        </p>
      )}

      <ol className={styles.quizQuestionList}>
        {questions.map((question, index) => (
          <li key={question.id} className={styles.quizQuestionItem}>
            {editingId === question.id ? (
              <QuizQuestionForm
                initialDraft={toQuestionDraft(question)}
                saving={busy}
                onSave={handleSaveQuestion}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className={styles.quizQuestionHeader}>
                  <div className={styles.materialFileInfo}>
                    <span className={styles.lessonTitle}>{question.text}</span>
                    <span className={styles.quizQuestionType}>{QUESTION_TYPE_LABELS[question.type]}</span>
                  </div>
                  {!readOnly && (
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => handleMove(index, -1)}
                        disabled={busy || index === 0}
                        aria-label="Вгору"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => handleMove(index, 1)}
                        disabled={busy || index === questions.length - 1}
                        aria-label="Вниз"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.buttonSecondary}`}
                        onClick={() => setEditingId(question.id)}
                        disabled={busy}
                      >
                        Редагувати
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.buttonSecondary}`}
                        onClick={() => handleDeleteQuestion(question)}
                        disabled={busy}
                      >
                        Видалити
                      </button>
                    </div>
                  )}
                </div>
                <ul className={styles.quizOptionList}>
                  {[...question.options]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((option) => (
                      <li key={option.id}>
                        {option.text}
                        {option.isCorrect && ' (правильна)'}
                      </li>
                    ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ol>

      {!readOnly && editingId === 'new' && (
        <QuizQuestionForm
          initialDraft={emptyQuestionDraft()}
          saving={busy}
          onSave={handleSaveQuestion}
          onCancel={() => setEditingId(null)}
        />
      )}

      {!readOnly && editingId !== 'new' && (
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => setEditingId('new')}
          disabled={busy || editingId !== null}
        >
          + Додати питання
        </button>
      )}
    </div>
  );
};

export default LessonQuizEditor;

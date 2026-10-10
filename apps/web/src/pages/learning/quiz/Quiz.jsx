import { useEffect, useMemo, useRef, useState } from 'react';

import styles from './Quiz.module.css';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds,
  ).padStart(2, '0')}`;
};

const Quiz = ({
  quiz,
  submitting,
  result,
  error,
  onSubmit,
  onResetResult,
}) => {
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(
    quiz.timeLimitSec ?? null,
  );

  const submittedByTimerRef = useRef(false);

  const isPassed = result?.attempt?.isPassed ?? false;

  const canRetry =
    result &&
    !isPassed &&
    (result.attempt.attemptsAllowed === null ||
      result.attempt.attemptsUsed <
        result.attempt.attemptsAllowed);

  const prepareAnswers = () => {
    return quiz.questions.map((question) => ({
      questionId: question.id,
      optionIds: answers[question.id] ?? [],
    }));
  };

  useEffect(() => {
    if (
      timeLeft === null ||
      result ||
      submitting ||
      timeLeft <= 0
    ) {
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft((current) =>
        current > 0 ? current - 1 : 0,
      );
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [timeLeft, result, submitting]);

  useEffect(() => {
    if (
      timeLeft !== 0 ||
      result ||
      submitting ||
      submittedByTimerRef.current
    ) {
      return;
    }

    submittedByTimerRef.current = true;

    onSubmit(prepareAnswers());
  }, [timeLeft, result, submitting]);

  const answeredCount = useMemo(() => {
    return quiz.questions.filter(
      (question) =>
        (answers[question.id]?.length ?? 0) > 0,
    ).length;
  }, [answers, quiz.questions]);

  const handleSingleChange = (questionId, optionId) => {
    if (result || submitting || timeLeft === 0) return;

    setAnswers((current) => ({
      ...current,
      [questionId]: [optionId],
    }));
  };

  const handleMultipleChange = (
    questionId,
    optionId,
  ) => {
    if (result || submitting || timeLeft === 0) return;

    setAnswers((current) => {
      const selected = current[questionId] ?? [];

      const nextSelected = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];

      return {
        ...current,
        [questionId]: nextSelected,
      };
    });
  };

  const handleSubmit = () => {
    if (submitting || result) return;

    onSubmit(prepareAnswers());
  };

  const handleRetry = () => {
    setAnswers({});
    setTimeLeft(quiz.timeLimitSec ?? null);
    submittedByTimerRef.current = false;
    onResetResult();
  };

  return (
    <div className={styles.quiz}>
      <div className={styles.header}>
        <div>
          <span className={styles.label}>
            Тест
          </span>

          <h3>{quiz.title}</h3>

          <p>
            Прохідний бал: {quiz.passScore}%
          </p>
        </div>

        {timeLeft !== null && !result && (
          <div className={styles.timer}>
            <span>Залишилось</span>
            <strong>{formatTime(timeLeft)}</strong>
          </div>
        )}
      </div>

      {!result && (
        <div className={styles.quizProgress}>
          Відповіді: {answeredCount} з{' '}
          {quiz.questions.length}
        </div>
      )}

      {timeLeft === 0 && !result && (
        <div className={styles.timeExpired}>
          Час вичерпано. Відповіді відправлено на перевірку.
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.questions}>
        {quiz.questions.map(
          (question, questionIndex) => {
            const questionResult =
              result?.questions?.find(
                (item) =>
                  item.questionId === question.id,
              );

            const correctOptionIds =
              questionResult?.correctOptionIds ?? [];

            return (
              <div
                key={question.id}
                className={styles.question}
              >
                <div className={styles.questionHeader}>
                  <span>
                    Питання {questionIndex + 1}
                  </span>

                  <span>
                    {question.points}{' '}
                    {question.points === 1
                      ? 'бал'
                      : 'бали'}
                  </span>
                </div>

                <h4>{question.text}</h4>

                {question.type === 'MULTIPLE' && (
                  <p className={styles.hint}>
                    Оберіть усі правильні варіанти
                  </p>
                )}

                <div className={styles.options}>
                  {question.options.map((option) => {
                    const checked = (
                      answers[question.id] ?? []
                    ).includes(option.id);

                    const isCorrectOption =
                      correctOptionIds.includes(option.id);

                    const isSelectedIncorrect =
                      Boolean(questionResult) &&
                      checked &&
                      !questionResult.isCorrect &&
                      !isCorrectOption;

                    const optionClassName = [
                      styles.option,
                      isCorrectOption
                        ? styles.correctOption
                        : '',
                      isSelectedIncorrect
                        ? styles.incorrectOption
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <label
                        key={option.id}
                        className={optionClassName}
                      >
                        <input
                          type={
                            question.type === 'SINGLE'
                              ? 'radio'
                              : 'checkbox'
                          }
                          name={question.id}
                          checked={checked}
                          disabled={
                            Boolean(result) ||
                            submitting ||
                            timeLeft === 0
                          }
                          onChange={() => {
                            if (
                              question.type ===
                              'SINGLE'
                            ) {
                              handleSingleChange(
                                question.id,
                                option.id,
                              );
                            } else {
                              handleMultipleChange(
                                question.id,
                                option.id,
                              );
                            }
                          }}
                        />

                        <span>{option.text}</span>

                        {isCorrectOption && (
                          <strong
                            className={
                              styles.optionResult
                            }
                          >
                            ✓
                          </strong>
                        )}

                        {isSelectedIncorrect && (
                          <strong
                            className={
                              styles.optionResult
                            }
                          >
                            ✕
                          </strong>
                        )}
                      </label>
                    );
                  })}
                </div>

                {questionResult && (
                  <div
                    className={
                      questionResult.isCorrect
                        ? styles.correct
                        : styles.incorrect
                    }
                  >
                    {questionResult.isCorrect
                      ? '✓ Правильна відповідь'
                      : '✕ Неправильна відповідь'}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>

      {result ? (
        <>
          <div
            className={`${styles.result} ${
              isPassed
                ? styles.passed
                : styles.failed
            }`}
          >
            <h3>
              {isPassed
                ? 'Тест пройдено'
                : 'Тест не пройдено'}
            </h3>

            <strong>
              {result.attempt.percent}%
            </strong>

            <p>
              {result.attempt.score} з{' '}
              {result.attempt.maxScore} балів
            </p>

            <p>
              Спроб використано:{' '}
              {result.attempt.attemptsUsed}
              {result.attempt.attemptsAllowed !== null &&
                ` з ${result.attempt.attemptsAllowed}`}
            </p>
          </div>

          {canRetry && (
            <button
              type="button"
              className={styles.submit}
              onClick={handleRetry}
            >
              Спробувати ще раз
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          className={styles.submit}
          disabled={
            submitting ||
            timeLeft === 0
          }
          onClick={handleSubmit}
        >
          {submitting
            ? 'Перевіряємо...'
            : 'Завершити тест'}
        </button>
      )}
    </div>
  );
};

export default Quiz;
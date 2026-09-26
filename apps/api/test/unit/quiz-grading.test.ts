import { QuestionType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  gradeQuiz,
  hasAttemptsLeft,
  shouldRevealCorrectAnswers,
  type GradingQuestion,
} from '../../src/modules/learning/quiz-grading.js';

const single: GradingQuestion = {
  id: 'q1',
  type: QuestionType.SINGLE,
  points: 1,
  options: [
    { id: 'q1a', isCorrect: true },
    { id: 'q1b', isCorrect: false },
    { id: 'q1c', isCorrect: false },
  ],
};

const multiple: GradingQuestion = {
  id: 'q2',
  type: QuestionType.MULTIPLE,
  points: 2,
  options: [
    { id: 'q2a', isCorrect: true },
    { id: 'q2b', isCorrect: true },
    { id: 'q2c', isCorrect: false },
  ],
};

function graded(result: ReturnType<typeof gradeQuiz>) {
  if (!result.ok) throw new Error('expected a graded result');
  return result;
}

describe('gradeQuiz', () => {
  it('marks a SINGLE question right and wrong', () => {
    const right = graded(gradeQuiz([single], [{ questionId: 'q1', optionIds: ['q1a'] }], 60));
    expect(right.questions[0]).toEqual({
      questionId: 'q1',
      isCorrect: true,
      selectedOptionIds: ['q1a'],
      correctOptionIds: ['q1a'],
    });
    expect(right.score).toBe(1);

    const wrong = graded(gradeQuiz([single], [{ questionId: 'q1', optionIds: ['q1b'] }], 60));
    expect(wrong.questions[0]?.isCorrect).toBe(false);
    expect(wrong.score).toBe(0);
  });

  it('requires the exact set for a MULTIPLE question', () => {
    const exact = graded(gradeQuiz([multiple], [{ questionId: 'q2', optionIds: ['q2b', 'q2a'] }], 60));
    expect(exact.questions[0]?.isCorrect).toBe(true);
    expect(exact.questions[0]?.selectedOptionIds).toEqual(['q2a', 'q2b']);

    const subset = graded(gradeQuiz([multiple], [{ questionId: 'q2', optionIds: ['q2a'] }], 60));
    expect(subset.questions[0]?.isCorrect).toBe(false);

    const superset = graded(gradeQuiz([multiple], [{ questionId: 'q2', optionIds: ['q2a', 'q2b', 'q2c'] }], 60));
    expect(superset.questions[0]?.isCorrect).toBe(false);
  });

  it('treats an unanswered question as wrong and keeps quiz order', () => {
    const result = graded(gradeQuiz([single, multiple], [{ questionId: 'q2', optionIds: ['q2a', 'q2b'] }], 60));
    expect(result.questions.map((question) => question.questionId)).toEqual(['q1', 'q2']);
    expect(result.questions[0]).toMatchObject({ isCorrect: false, selectedOptionIds: [] });
    expect(result.score).toBe(2);
  });

  it('weighs questions by points and rounds the percent down', () => {
    const result = graded(gradeQuiz([single, multiple], [{ questionId: 'q1', optionIds: ['q1a'] }], 60));
    expect(result.score).toBe(1);
    expect(result.maxScore).toBe(3);
    expect(result.percent).toBe(33);
  });

  it('passes exactly at the threshold and fails one percent below', () => {
    const questions = [single, multiple];
    const answers = [{ questionId: 'q2', optionIds: ['q2a', 'q2b'] }];

    // 2 of 3 points -> 66%
    expect(graded(gradeQuiz(questions, answers, 66)).isPassed).toBe(true);
    expect(graded(gradeQuiz(questions, answers, 67)).isPassed).toBe(false);
  });

  it('never passes a quiz without points', () => {
    const result = graded(gradeQuiz([], [], 0));
    expect(result.maxScore).toBe(0);
    expect(result.isPassed).toBe(false);
  });

  it('rejects a question from another quiz', () => {
    const result = gradeQuiz([single], [{ questionId: 'other', optionIds: [] }], 60);
    expect(result).toEqual({
      ok: false,
      details: [{ field: 'answers.0.questionId', message: 'Question does not belong to this quiz' }],
    });
  });

  it('rejects an option of another question', () => {
    const result = gradeQuiz([single, multiple], [{ questionId: 'q1', optionIds: ['q2a'] }], 60);
    expect(result).toEqual({
      ok: false,
      details: [{ field: 'answers.0.optionIds.0', message: 'Option does not belong to this question' }],
    });
  });

  it('rejects two options for a SINGLE question', () => {
    const result = gradeQuiz([single], [{ questionId: 'q1', optionIds: ['q1a', 'q1b'] }], 60);
    expect(result).toEqual({
      ok: false,
      details: [{ field: 'answers.0.optionIds', message: 'Only one option can be selected' }],
    });
  });

  it('rejects a repeated question', () => {
    const result = gradeQuiz(
      [single],
      [
        { questionId: 'q1', optionIds: ['q1a'] },
        { questionId: 'q1', optionIds: ['q1b'] },
      ],
      60,
    );
    expect(result).toEqual({
      ok: false,
      details: [{ field: 'answers.1.questionId', message: 'Question is answered more than once' }],
    });
  });

  it('rejects a repeated option', () => {
    const result = gradeQuiz([multiple], [{ questionId: 'q2', optionIds: ['q2a', 'q2a'] }], 60);
    expect(result).toEqual({
      ok: false,
      details: [{ field: 'answers.0.optionIds.1', message: 'Option is selected more than once' }],
    });
  });
});

describe('hasAttemptsLeft', () => {
  it('is unlimited when attemptsAllowed is null', () => {
    expect(hasAttemptsLeft(1000, null)).toBe(true);
  });

  it('compares used attempts with the limit', () => {
    expect(hasAttemptsLeft(1, 2)).toBe(true);
    expect(hasAttemptsLeft(2, 2)).toBe(false);
    expect(hasAttemptsLeft(3, 2)).toBe(false);
  });
});

describe('shouldRevealCorrectAnswers', () => {
  it('reveals after a pass', () => {
    expect(shouldRevealCorrectAnswers(true, 1, null)).toBe(true);
    expect(shouldRevealCorrectAnswers(true, 1, 5)).toBe(true);
  });

  it('reveals when attempts are exhausted', () => {
    expect(shouldRevealCorrectAnswers(false, 2, 2)).toBe(true);
  });

  it('hides while attempts remain or are unlimited', () => {
    expect(shouldRevealCorrectAnswers(false, 1, 2)).toBe(false);
    expect(shouldRevealCorrectAnswers(false, 50, null)).toBe(false);
  });
});

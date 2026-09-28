import { QuestionType } from '@prisma/client';
import type { ErrorDetail } from '../../lib/errors.js';
import { calculateProgressPercent } from './progress.js';

export interface GradingQuestion {
  id: string;
  type: QuestionType;
  points: number;
  options: readonly { id: string; isCorrect: boolean }[];
}

export interface SubmittedAnswer {
  questionId: string;
  optionIds: readonly string[];
}

export interface GradedQuestion {
  questionId: string;
  isCorrect: boolean;
  selectedOptionIds: string[];
  correctOptionIds: string[];
}

export type GradingResult =
  | { ok: true; score: number; maxScore: number; percent: number; isPassed: boolean; questions: GradedQuestion[] }
  | { ok: false; details: ErrorDetail[] };

function validateAnswers(questions: readonly GradingQuestion[], answers: readonly SubmittedAnswer[]): ErrorDetail[] {
  const details: ErrorDetail[] = [];
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const seenQuestionIds = new Set<string>();

  answers.forEach((answer, answerIndex) => {
    const question = questionsById.get(answer.questionId);

    if (seenQuestionIds.has(answer.questionId)) {
      details.push({ field: `answers.${answerIndex}.questionId`, message: 'Question is answered more than once' });
    }
    seenQuestionIds.add(answer.questionId);

    if (question === undefined) {
      details.push({ field: `answers.${answerIndex}.questionId`, message: 'Question does not belong to this quiz' });
      return;
    }

    const validOptionIds = new Set(question.options.map((option) => option.id));
    const seenOptionIds = new Set<string>();

    answer.optionIds.forEach((optionId, optionIndex) => {
      const field = `answers.${answerIndex}.optionIds.${optionIndex}`;

      if (!validOptionIds.has(optionId)) {
        details.push({ field, message: 'Option does not belong to this question' });
      } else if (seenOptionIds.has(optionId)) {
        details.push({ field, message: 'Option is selected more than once' });
      }
      seenOptionIds.add(optionId);
    });

    if (question.type === QuestionType.SINGLE && answer.optionIds.length > 1) {
      details.push({ field: `answers.${answerIndex}.optionIds`, message: 'Only one option can be selected' });
    }
  });

  return details;
}

/**
 * A question counts only when the selected set equals the correct set
 * exactly, for SINGLE and MULTIPLE alike: no partial credit.
 */
export function gradeQuiz(
  questions: readonly GradingQuestion[],
  answers: readonly SubmittedAnswer[],
  passScore: number,
): GradingResult {
  const details = validateAnswers(questions, answers);
  if (details.length > 0) return { ok: false, details };

  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer.optionIds]));

  let score = 0;
  let maxScore = 0;

  const graded = questions.map((question): GradedQuestion => {
    const selectedOptionIds = [...(answersByQuestion.get(question.id) ?? [])].sort();
    const correctOptionIds = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id)
      .sort();

    const isCorrect =
      selectedOptionIds.length === correctOptionIds.length &&
      selectedOptionIds.every((optionId, index) => optionId === correctOptionIds[index]);

    maxScore += question.points;
    if (isCorrect) score += question.points;

    return { questionId: question.id, isCorrect, selectedOptionIds, correctOptionIds };
  });

  const percent = calculateProgressPercent(score, maxScore);

  return { ok: true, score, maxScore, percent, isPassed: maxScore > 0 && percent >= passScore, questions: graded };
}

export function hasAttemptsLeft(attemptsUsed: number, attemptsAllowed: number | null): boolean {
  return attemptsAllowed === null || attemptsUsed < attemptsAllowed;
}

/**
 * While attempts remain, revealing the right answers would turn the next
 * attempt into copying, so they are shown only after a pass or the last try.
 */
export function shouldRevealCorrectAnswers(
  isPassed: boolean,
  attemptsUsed: number,
  attemptsAllowed: number | null,
): boolean {
  return isPassed || (attemptsAllowed !== null && attemptsUsed >= attemptsAllowed);
}

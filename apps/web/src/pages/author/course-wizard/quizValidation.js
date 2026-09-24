// Mirrors createQuestionSchema / createQuizSchema on the API so the author
// sees a Ukrainian message before the request instead of a raw English 400.

export const QUESTION_TYPE_LABELS = {
  SINGLE: 'Одна правильна відповідь',
  MULTIPLE: 'Кілька правильних відповідей',
};

let draftCounter = 0;

const nextDraftKey = () => {
  const key = `draft-${draftCounter}`;
  draftCounter += 1;
  return key;
};

const emptyOption = () => ({ key: nextDraftKey(), text: '', isCorrect: false });

export const emptyQuestionDraft = () => ({
  text: '',
  type: 'SINGLE',
  options: [emptyOption(), emptyOption()],
});

export const toQuestionDraft = (question) => ({
  text: question.text,
  type: question.type,
  options: [...question.options]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((option) => ({ key: option.id, text: option.text, isCorrect: option.isCorrect })),
});

export const validateQuestionDraft = (draft) => {
  if (draft.text.trim() === '') return 'Вкажіть текст питання.';

  if (draft.options.some((option) => option.text.trim() === '')) {
    return 'Заповніть текст кожного варіанта або видаліть його.';
  }

  if (draft.options.length < 2) return 'Додайте щонайменше два варіанти відповіді.';

  const correctCount = draft.options.filter((option) => option.isCorrect).length;
  if (correctCount === 0) return 'Позначте правильну відповідь.';

  if (draft.type === 'SINGLE' && correctCount !== 1) {
    return 'У питанні з однією відповіддю має бути рівно один правильний варіант.';
  }

  return null;
};

export const toQuestionPayload = (draft) => ({
  text: draft.text.trim(),
  type: draft.type,
  options: draft.options.map((option, index) => ({
    text: option.text.trim(),
    isCorrect: option.isCorrect,
    sortOrder: index,
  })),
});

const isInteger = (value) => /^-?\d+$/.test(value.trim());

export const validateQuizSettings = ({ passScore, attemptsAllowed }) => {
  const errors = {};

  const score = Number(passScore);
  if (!isInteger(passScore) || score < 0 || score > 100) {
    errors.passScore = 'Прохідний бал — ціле число від 0 до 100.';
  }

  if (attemptsAllowed.trim() !== '' && (!isInteger(attemptsAllowed) || Number(attemptsAllowed) < 1)) {
    errors.attemptsAllowed = 'Кількість спроб — ціле число від 1 або порожнє поле.';
  }

  return errors;
};

export const toQuizSettingsPayload = ({ passScore, attemptsAllowed }) => ({
  passScore: Number(passScore),
  attemptsAllowed: attemptsAllowed.trim() === '' ? null : Number(attemptsAllowed),
});

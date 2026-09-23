import type { ErrorDetail } from '../../lib/errors.js';

export interface FoundTopic {
  id: string;
  subjectId: string;
}

/**
 * Rules for the topics an author attaches to a course: every id must exist,
 * and all topics must belong to one subject (a course teaches one subject).
 */
export function findTopicSelectionProblems(
  requestedIds: readonly string[],
  foundTopics: readonly FoundTopic[],
): ErrorDetail[] {
  const problems: ErrorDetail[] = [];
  const foundIds = new Set(foundTopics.map((topic) => topic.id));

  if (requestedIds.some((id) => !foundIds.has(id))) {
    problems.push({ field: 'topicIds', message: 'Одна або кілька тем не існують' });
  }

  if (new Set(foundTopics.map((topic) => topic.subjectId)).size > 1) {
    problems.push({ field: 'topicIds', message: 'Теми мають належати одному предмету' });
  }

  return problems;
}

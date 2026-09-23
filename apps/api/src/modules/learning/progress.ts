export type ProgressState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface OrderedLesson {
  id: string;
  title: string;
}

export interface ProgressSummary {
  state: ProgressState;
  percent: number;
  completedLessons: number;
  totalLessons: number;
  continueLesson: OrderedLesson | null;
}

/**
 * Rounds down so that 100 is reported only when every lesson is done. The
 * same function will write Enrollment.progressPercent when lesson completion
 * is recorded.
 */
export function calculateProgressPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.floor((completed * 100) / total);
}

export function summarizeProgress(
  orderedLessons: readonly OrderedLesson[],
  completedLessonIds: ReadonlySet<string>,
): ProgressSummary {
  const totalLessons = orderedLessons.length;
  const completedLessons = orderedLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
  const next = orderedLessons.find((lesson) => !completedLessonIds.has(lesson.id));

  let state: ProgressState = 'NOT_STARTED';
  if (totalLessons > 0 && completedLessons === totalLessons) {
    state = 'COMPLETED';
  } else if (completedLessons > 0) {
    state = 'IN_PROGRESS';
  }

  return {
    state,
    percent: calculateProgressPercent(completedLessons, totalLessons),
    completedLessons,
    totalLessons,
    continueLesson: next === undefined ? null : { id: next.id, title: next.title },
  };
}

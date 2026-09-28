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

export interface EnrollmentProgressSnapshot {
  orderedLessons: readonly OrderedLesson[];
  completedLessonIds: ReadonlySet<string>;
  completedAt: Date | null;
}

export interface EnrollmentProgressDecision {
  summary: ProgressSummary;
  progressPercent: number;
  completedAt: Date | null;
}

/**
 * Enrollment.completedAt keeps the date of the first completion: it is never
 * cleared or moved, even if lessons are added to the course later.
 */
export function decideEnrollmentProgress(snapshot: EnrollmentProgressSnapshot, now: Date): EnrollmentProgressDecision {
  const summary = summarizeProgress(snapshot.orderedLessons, snapshot.completedLessonIds);

  let completedAt: Date | null = null;
  if (snapshot.completedAt !== null) {
    completedAt = snapshot.completedAt;
  } else if (summary.state === 'COMPLETED') {
    completedAt = now;
  }

  return { summary, progressPercent: summary.percent, completedAt };
}

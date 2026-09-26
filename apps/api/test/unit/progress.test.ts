import { describe, expect, it } from 'vitest';
import {
  calculateProgressPercent,
  decideEnrollmentProgress,
  summarizeProgress,
} from '../../src/modules/learning/progress.js';

const lessons = [
  { id: 'l1', title: 'One' },
  { id: 'l2', title: 'Two' },
  { id: 'l3', title: 'Three' },
];

describe('calculateProgressPercent', () => {
  it('returns 0 for an empty program', () => {
    expect(calculateProgressPercent(0, 0)).toBe(0);
  });

  it('rounds down', () => {
    expect(calculateProgressPercent(1, 3)).toBe(33);
    expect(calculateProgressPercent(2, 3)).toBe(66);
  });

  it('reaches 100 only when everything is done', () => {
    expect(calculateProgressPercent(3, 3)).toBe(100);
  });
});

describe('summarizeProgress', () => {
  it('handles an empty program', () => {
    expect(summarizeProgress([], new Set())).toEqual({
      state: 'NOT_STARTED',
      percent: 0,
      completedLessons: 0,
      totalLessons: 0,
      continueLesson: null,
    });
  });

  it('continues from the first lesson when nothing is completed', () => {
    const summary = summarizeProgress(lessons, new Set());
    expect(summary.state).toBe('NOT_STARTED');
    expect(summary.continueLesson).toEqual({ id: 'l1', title: 'One' });
  });

  it('continues from the first incomplete lesson when only the second is completed', () => {
    const summary = summarizeProgress(lessons, new Set(['l2']));
    expect(summary.state).toBe('IN_PROGRESS');
    expect(summary.completedLessons).toBe(1);
    expect(summary.percent).toBe(33);
    expect(summary.continueLesson).toEqual({ id: 'l1', title: 'One' });
  });

  it('is COMPLETED with no continue lesson when everything is done', () => {
    const summary = summarizeProgress(lessons, new Set(['l1', 'l2', 'l3']));
    expect(summary.state).toBe('COMPLETED');
    expect(summary.percent).toBe(100);
    expect(summary.continueLesson).toBeNull();
  });

  it('ignores completed ids that are not in the program', () => {
    const summary = summarizeProgress(lessons, new Set(['gone', 'l1']));
    expect(summary.completedLessons).toBe(1);
    expect(summary.totalLessons).toBe(3);
  });
});

describe('decideEnrollmentProgress', () => {
  const now = new Date('2026-09-24T10:00:00.000Z');
  const firstCompletion = new Date('2026-01-01T00:00:00.000Z');

  it('keeps an already set completedAt', () => {
    const decision = decideEnrollmentProgress(
      { orderedLessons: lessons, completedLessonIds: new Set(['l1']), completedAt: firstCompletion },
      now,
    );
    expect(decision.completedAt).toBe(firstCompletion);
    expect(decision.progressPercent).toBe(33);
  });

  it('keeps the first completion date when everything is done again', () => {
    const decision = decideEnrollmentProgress(
      { orderedLessons: lessons, completedLessonIds: new Set(['l1', 'l2', 'l3']), completedAt: firstCompletion },
      now,
    );
    expect(decision.completedAt).toBe(firstCompletion);
  });

  it('sets now when the program becomes completed', () => {
    const decision = decideEnrollmentProgress(
      { orderedLessons: lessons, completedLessonIds: new Set(['l1', 'l2', 'l3']), completedAt: null },
      now,
    );
    expect(decision.completedAt).toBe(now);
    expect(decision.progressPercent).toBe(100);
    expect(decision.summary.state).toBe('COMPLETED');
  });

  it('leaves completedAt null while the program is incomplete', () => {
    const decision = decideEnrollmentProgress(
      { orderedLessons: lessons, completedLessonIds: new Set(['l1', 'l2']), completedAt: null },
      now,
    );
    expect(decision.completedAt).toBeNull();
    expect(decision.progressPercent).toBe(66);
  });
});

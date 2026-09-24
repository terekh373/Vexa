import { describe, expect, it } from 'vitest';
import { findTopicSelectionProblems } from '../../src/modules/author/author.topics.js';

describe('findTopicSelectionProblems', () => {
  it('returns nothing when every id exists and all topics share a subject', () => {
    const found = [
      { id: 't1', subjectId: 's1' },
      { id: 't2', subjectId: 's1' },
    ];

    expect(findTopicSelectionProblems(['t1', 't2'], found)).toEqual([]);
  });

  it('reports a requested id that was not found', () => {
    expect(findTopicSelectionProblems(['t1', 't2'], [{ id: 't1', subjectId: 's1' }])).toEqual([
      { field: 'topicIds', message: 'Одна або кілька тем не існують' },
    ]);
  });

  it('reports topics from different subjects', () => {
    const found = [
      { id: 't1', subjectId: 's1' },
      { id: 't2', subjectId: 's2' },
    ];

    expect(findTopicSelectionProblems(['t1', 't2'], found)).toEqual([
      { field: 'topicIds', message: 'Теми мають належати одному предмету' },
    ]);
  });

  it('accepts an empty selection', () => {
    expect(findTopicSelectionProblems([], [])).toEqual([]);
  });
});

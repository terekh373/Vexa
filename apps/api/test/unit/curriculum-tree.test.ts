import { describe, expect, it } from 'vitest';
import {
  buildCurriculumTree,
  type CurriculumSubjectRow,
  type CurriculumTopicRow,
} from '../../src/modules/curriculum/curriculum.tree.js';

function topic(id: string, grade: number | null, title: string, sortOrder = 0): CurriculumTopicRow {
  return { id, grade, title, sortOrder };
}

function subject(nameUk: string, topics: CurriculumTopicRow[] = []): CurriculumSubjectRow {
  return { id: `id-${nameUk}`, slug: nameUk.toLowerCase(), nameUk, topics };
}

describe('buildCurriculumTree', () => {
  it('orders subjects by Ukrainian name', () => {
    const tree = buildCurriculumTree([subject('Математика'), subject('Англійська мова'), subject('Фізика')]);

    expect(tree.map((node) => node.nameUk)).toEqual(['Англійська мова', 'Математика', 'Фізика']);
  });

  it('orders grades ascending and puts the null grade last', () => {
    const [node] = buildCurriculumTree([
      subject('Математика', [
        topic('a', null, 'Підготовка до НМТ'),
        topic('b', 10, 'Функції'),
        topic('c', 2, 'Додавання'),
        topic('d', 9, 'Рівняння'),
      ]),
    ]);

    expect(node?.grades.map((grade) => grade.grade)).toEqual([2, 9, 10, null]);
  });

  it('orders topics by sortOrder, then title', () => {
    const [node] = buildCurriculumTree([
      subject('Математика', [
        topic('1', 9, 'Ірраціональні числа', 2),
        topic('2', 9, 'Функції', 1),
        topic('3', 9, 'Рівняння', 1),
      ]),
    ]);

    expect(node?.grades[0]?.topics.map((item) => item.id)).toEqual(['3', '2', '1']);
  });

  it('keeps a subject without topics with empty grades', () => {
    const tree = buildCurriculumTree([subject('Хімія')]);

    expect(tree).toEqual([{ id: 'id-Хімія', slug: 'хімія', nameUk: 'Хімія', grades: [] }]);
  });
});

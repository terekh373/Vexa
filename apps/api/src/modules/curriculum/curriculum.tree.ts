/**
 * Pure assembly of the curriculum tree: no I/O, so ordering rules are unit-testable.
 */
import type {
  CurriculumGradeNode,
  CurriculumSubjectNode,
  CurriculumTopicNode,
} from '@vexa/shared';

export interface CurriculumTopicRow {
  id: string;
  grade: number | null;
  title: string;
  sortOrder: number;
}

export interface CurriculumSubjectRow {
  id: string;
  slug: string;
  nameUk: string;
  topics: CurriculumTopicRow[];
}

const compareText = (a: string, b: string): number => a.localeCompare(b, 'uk');

function compareTopics(a: CurriculumTopicNode, b: CurriculumTopicNode): number {
  return a.sortOrder - b.sortOrder || compareText(a.title, b.title);
}

// Topics outside the school programme (grade null) come last so the grades
// read 1..11 first, the way a school does.
function compareGrades(a: CurriculumGradeNode, b: CurriculumGradeNode): number {
  if (a.grade === b.grade) return 0;
  if (a.grade === null) return 1;
  if (b.grade === null) return -1;
  return a.grade - b.grade;
}

function groupByGrade(topics: CurriculumTopicRow[]): CurriculumGradeNode[] {
  const groups = new Map<number | null, CurriculumTopicNode[]>();

  for (const topic of topics) {
    const node: CurriculumTopicNode = { id: topic.id, title: topic.title, sortOrder: topic.sortOrder };
    const group = groups.get(topic.grade);
    if (group === undefined) {
      groups.set(topic.grade, [node]);
    } else {
      group.push(node);
    }
  }

  return [...groups.entries()]
    .map(([grade, items]): CurriculumGradeNode => ({ grade, topics: items.sort(compareTopics) }))
    .sort(compareGrades);
}

export function buildCurriculumTree(rows: CurriculumSubjectRow[]): CurriculumSubjectNode[] {
  return rows
    .map(
      (subject): CurriculumSubjectNode => ({
        id: subject.id,
        slug: subject.slug,
        nameUk: subject.nameUk,
        grades: groupByGrade(subject.topics),
      }),
    )
    .sort((a, b) => compareText(a.nameUk, b.nameUk));
}

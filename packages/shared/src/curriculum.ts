/**
 * School curriculum navigation contract: subject -> grade -> topic.
 *
 * The reference data is seeded, so there is no admin CRUD; clients only read it.
 */

export interface CurriculumTopicNode {
  id: string;
  title: string;
  sortOrder: number;
}

export interface CurriculumGradeNode {
  /** `null` groups topics outside the school programme, e.g. exam preparation. */
  grade: number | null;
  topics: CurriculumTopicNode[];
}

export interface CurriculumSubjectNode {
  id: string;
  slug: string;
  nameUk: string;
  grades: CurriculumGradeNode[];
}

export interface CurriculumResponse {
  items: CurriculumSubjectNode[];
}

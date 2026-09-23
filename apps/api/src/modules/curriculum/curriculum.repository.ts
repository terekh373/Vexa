/**
 * Persistence for the school curriculum reference data. Prisma calls only —
 * tree assembly lives in curriculum.tree.ts.
 */
import { prisma } from '../../lib/prisma.js';
import type { CurriculumSubjectRow } from './curriculum.tree.js';

/** Every subject with all of its topics in a single round trip. */
export async function findSubjectsWithTopics(): Promise<CurriculumSubjectRow[]> {
  return prisma.curriculumSubject.findMany({
    select: {
      id: true,
      slug: true,
      nameUk: true,
      topics: { select: { id: true, grade: true, title: true, sortOrder: true } },
    },
  });
}

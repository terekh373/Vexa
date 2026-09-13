/**
 * Persistence for the category taxonomy. Prisma calls only — tree assembly
 * happens in the service.
 */
import { prisma } from '../../lib/prisma.js';

export interface CategoryRow {
  id: string;
  slug: string;
  nameUk: string;
  parentId: string | null;
  sortOrder: number;
}

/** Flat, active-only list, sorted for direct tree assembly (parents' order preserved within each level). */
export async function findActiveCategories(): Promise<CategoryRow[]> {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { nameUk: 'asc' }],
    select: {
      id: true,
      slug: true,
      nameUk: true,
      parentId: true,
      sortOrder: true,
    },
  });
}

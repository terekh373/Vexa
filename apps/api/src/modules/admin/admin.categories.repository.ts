/**
 * Persistence for admin category management. Prisma calls only — slug
 * uniqueness and tree-depth rules live in the service.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const adminCategorySelect = {
  id: true,
  parentId: true,
  slug: true,
  nameUk: true,
  nameEn: true,
  iconKey: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  // No `where` on the relations: soft-deleted courses still hold the FK, so
  // they must count toward the "has courses" delete guard.
  _count: { select: { courses: true, children: true } },
} satisfies Prisma.CategorySelect;

export type AdminCategoryRow = Prisma.CategoryGetPayload<{ select: typeof adminCategorySelect }>;

export async function findAllCategories(): Promise<AdminCategoryRow[]> {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { nameUk: 'asc' }],
    select: adminCategorySelect,
  });
}

export async function findCategoryById(id: string): Promise<AdminCategoryRow | null> {
  return prisma.category.findUnique({ where: { id }, select: adminCategorySelect });
}

export interface CategoryParentInfo {
  id: string;
  parentId: string | null;
}

export async function findCategoryParentInfoById(id: string): Promise<CategoryParentInfo | null> {
  return prisma.category.findUnique({ where: { id }, select: { id: true, parentId: true } });
}

export async function findCategoryBySlug(slug: string): Promise<{ id: string } | null> {
  return prisma.category.findUnique({ where: { slug }, select: { id: true } });
}

export async function createCategory(
  data: Prisma.CategoryUncheckedCreateInput,
): Promise<AdminCategoryRow> {
  return prisma.category.create({ data, select: adminCategorySelect });
}

export async function updateCategory(
  id: string,
  data: Prisma.CategoryUncheckedUpdateInput,
): Promise<AdminCategoryRow> {
  return prisma.category.update({ where: { id }, data, select: adminCategorySelect });
}

export async function deleteCategory(id: string): Promise<void> {
  await prisma.category.delete({ where: { id } });
}

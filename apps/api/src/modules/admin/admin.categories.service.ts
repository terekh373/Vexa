import { AppError } from '../../lib/errors.js';
import { invalidateCategoryTree } from '../categories/categories.service.js';
import {
  createCategory,
  deleteCategory,
  findAllCategories,
  findCategoryById,
  findCategoryBySlug,
  findCategoryParentInfoById,
  updateCategory,
  type AdminCategoryRow,
} from './admin.categories.repository.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './admin.categories.validation.js';

function toCategoryResponse(row: AdminCategoryRow) {
  return {
    id: row.id,
    parentId: row.parentId,
    slug: row.slug,
    nameUk: row.nameUk,
    nameEn: row.nameEn,
    iconKey: row.iconKey,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    coursesCount: row._count.courses,
    childrenCount: row._count.children,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parentIdIssue(message: string): AppError {
  return AppError.validation(message, [{ field: 'parentId', message }]);
}

export async function listCategories() {
  const rows = await findAllCategories();
  return { items: rows.map(toCategoryResponse) };
}

async function requireCategory(id: string): Promise<AdminCategoryRow> {
  const category = await findCategoryById(id);
  if (category === null) throw AppError.notFound('Category not found');
  return category;
}

export async function createCategoryEntry(input: CreateCategoryInput) {
  const existing = await findCategoryBySlug(input.slug);
  if (existing !== null) throw AppError.conflict('Category slug is already taken');

  if (input.parentId !== null && input.parentId !== undefined) {
    const parent = await findCategoryParentInfoById(input.parentId);
    if (parent === null) throw parentIdIssue('Батьківська категорія не знайдена');
    // The tree is capped at two levels: a parent that itself has a parent
    // would make this category the third level.
    if (parent.parentId !== null) throw parentIdIssue('Категорії можуть мати не більше двох рівнів вкладеності');
  }

  const created = await createCategory({
    slug: input.slug,
    nameUk: input.nameUk,
    nameEn: input.nameEn ?? null,
    iconKey: input.iconKey ?? null,
    parentId: input.parentId ?? null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  });

  await invalidateCategoryTree();

  return toCategoryResponse(created);
}

export async function updateCategoryEntry(id: string, input: UpdateCategoryInput) {
  const category = await requireCategory(id);

  if (input.slug !== undefined && input.slug !== category.slug) {
    const existing = await findCategoryBySlug(input.slug);
    if (existing !== null && existing.id !== id) {
      throw AppError.conflict('Category slug is already taken');
    }
  }

  if (input.parentId !== undefined && input.parentId !== null) {
    if (input.parentId === id) throw parentIdIssue('Категорія не може бути батьківською для самої себе');

    const parent = await findCategoryParentInfoById(input.parentId);
    if (parent === null) throw parentIdIssue('Батьківська категорія не знайдена');
    if (parent.parentId !== null) throw parentIdIssue('Батьківська категорія має бути кореневою');
    // Moving a category with children under a parent would create a third level.
    if (category._count.children > 0) {
      throw parentIdIssue('Категорія з підкатегоріями не може мати батьківську категорію');
    }
  }

  const updated = await updateCategory(id, {
    slug: input.slug,
    nameUk: input.nameUk,
    nameEn: input.nameEn,
    iconKey: input.iconKey,
    parentId: input.parentId,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  });

  await invalidateCategoryTree();

  return toCategoryResponse(updated);
}

export async function deleteCategoryEntry(id: string): Promise<void> {
  const category = await requireCategory(id);

  if (category._count.courses > 0) throw AppError.conflict('Category has courses');
  if (category._count.children > 0) throw AppError.conflict('Category has subcategories');

  await deleteCategory(id);
  await invalidateCategoryTree();
}

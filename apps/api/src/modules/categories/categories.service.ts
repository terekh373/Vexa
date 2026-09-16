/**
 * Builds the public category tree served at GET /api/categories.
 *
 * The admin category CRUD calls `invalidateCategoryTree` after every write,
 * so a change is visible immediately; CACHE_TTL_SECONDS is only a safety net
 * for whatever bypasses that path (direct DB edits, `npm run db:seed`).
 */
import type { CategoryNode, CategoryTreeResponse } from '@vexa/shared';
import { getCached, invalidateCached } from '../../lib/cache.js';
import { findActiveCategories, type CategoryRow } from './categories.repository.js';

const CACHE_KEY = 'categories:tree:v1';
const CACHE_TTL_SECONDS = 300;

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const nodesById = new Map<string, CategoryNode>();

  for (const row of rows) {
    nodesById.set(row.id, {
      id: row.id,
      slug: row.slug,
      nameUk: row.nameUk,
      parentId: row.parentId,
      sortOrder: row.sortOrder,
      children: [],
    });
  }

  const roots: CategoryNode[] = [];

  for (const row of rows) {
    const node = nodesById.get(row.id);
    if (node === undefined) {
      continue;
    }

    if (row.parentId === null) {
      roots.push(node);
      continue;
    }

    // A parent absent from the active set means its branch was deactivated.
    // Dropping the child here cascades that deactivation to the whole
    // subtree instead of promoting orphans to the root level.
    const parent = nodesById.get(row.parentId);
    if (parent !== undefined) {
      parent.children.push(node);
    }
  }

  return roots;
}

export async function getCategoryTree(): Promise<CategoryTreeResponse> {
  const items = await getCached(CACHE_KEY, CACHE_TTL_SECONDS, async () => {
    const rows = await findActiveCategories();
    return buildTree(rows);
  });

  return { items };
}

/** Called by admin category writes so the public tree reflects them at once. */
export async function invalidateCategoryTree(): Promise<void> {
  await invalidateCached(CACHE_KEY);
}

/**
 * Public catalog taxonomy contract shared by the API and both clients.
 *
 * There is no admin CRUD for categories yet, so this shape stays intentionally
 * minimal: only what the catalog filter UI needs today.
 */

export interface CategoryNode {
  id: string;
  slug: string;
  nameUk: string;
  parentId: string | null;
  sortOrder: number;
  children: CategoryNode[];
}

export interface CategoryTreeResponse {
  items: CategoryNode[];
}

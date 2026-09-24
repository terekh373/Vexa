/**
 * Serves the public curriculum tree at GET /api/curriculum.
 *
 * There is no admin CRUD for the curriculum, so nothing invalidates the cache:
 * the TTL is the only invalidation. After `npm run db:seed` the data is
 * refreshed within CACHE_TTL_SECONDS at most.
 */
import type { CurriculumResponse } from '@vexa/shared';
import { getCached } from '../../lib/cache.js';
import { findSubjectsWithTopics } from './curriculum.repository.js';
import { buildCurriculumTree } from './curriculum.tree.js';

const CACHE_KEY = 'curriculum:tree:v1';
const CACHE_TTL_SECONDS = 300;

export async function getCurriculumTree(): Promise<CurriculumResponse> {
  const items = await getCached(CACHE_KEY, CACHE_TTL_SECONDS, async () => {
    const rows = await findSubjectsWithTopics();
    return buildCurriculumTree(rows);
  });

  return { items };
}

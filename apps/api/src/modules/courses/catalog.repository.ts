/**
 * Persistence for catalog autocomplete. Raw SQL lives here because trigram
 * operators are not expressible through Prisma's query builder.
 */
import { ContentType, Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { escapeLikePattern } from './catalog-suggest.js';

export const SUGGEST_WORD_SIMILARITY = 0.4;

export interface TitleSuggestionRow {
  id: string;
  slug: string;
  title: string;
  contentType: ContentType;
}

/**
 * ILIKE and `<%` are both served by the trigram index courses_title_trgm_idx.
 * `<%` is word similarity: the query is compared with the most similar part of
 * the title, so a typo in a few letters still finds a course by a fragment of
 * its title. The threshold is set per transaction (`set_config(..., true)`)
 * instead of globally, so it cannot leak into other queries on the pooled
 * connection.
 */
export async function findTitleSuggestions(
  q: string,
  limit: number,
): Promise<TitleSuggestionRow[]> {
  const escaped = escapeLikePattern(q);
  const contains = `%${escaped}%`;
  const prefix = `${escaped}%`;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT set_config('pg_trgm.word_similarity_threshold', ${SUGGEST_WORD_SIMILARITY}::text, true)`,
    );

    return tx.$queryRaw<TitleSuggestionRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.slug,
        c.title,
        c.type AS "contentType"
      FROM courses AS c
      WHERE c.status = 'PUBLISHED'::"CourseStatus"
        AND c.deleted_at IS NULL
        AND (
          c.title ILIKE ${contains} ESCAPE '\\'
          OR ${q} <% c.title
        )
      ORDER BY
        (c.title ILIKE ${prefix} ESCAPE '\\') DESC,
        word_similarity(${q}, c.title) DESC,
        c.students_count DESC,
        c.id ASC
      LIMIT ${limit}
    `);
  });
}

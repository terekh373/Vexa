-- Issue #3: catalog tags and PostgreSQL full-text search.

ALTER TABLE "courses"
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DROP INDEX IF EXISTS "courses_fts_idx";

-- PostgreSQL has no built-in Ukrainian stemming dictionary. The fixed 'simple'
-- configuration keeps Ukrainian/English tokens intact. The wrapper is immutable,
-- so the exact same tsvector expression can be used by a GIN index and by queries.
CREATE OR REPLACE FUNCTION vexa_course_search_vector(
  course_title TEXT,
  course_short_description TEXT,
  course_description TEXT,
  course_tags TEXT[]
)
RETURNS TSVECTOR
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    setweight(to_tsvector('simple'::regconfig, coalesce(course_title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(course_short_description, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(course_description, '')), 'C') ||
    setweight(
      to_tsvector('simple'::regconfig, coalesce(array_to_string(course_tags, ' '), '')),
      'B'
    );
$$;

CREATE INDEX "courses_fts_idx"
  ON "courses" USING GIN (
    vexa_course_search_vector("title", "short_description", "description", "tags")
  );

CREATE INDEX "courses_catalog_filters_idx"
  ON "courses" ("type", "language", "grade", "price_amount", "rating_avg")
  WHERE "status" = 'PUBLISHED' AND "deleted_at" IS NULL;

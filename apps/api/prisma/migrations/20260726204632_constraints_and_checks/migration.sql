-- Hand-written migration: invariants and search indexes that the Prisma schema cannot express.
-- The pg_trgm extension and the trigram index live in the init migration.

-- ---------------------------------------------------------------- invariants
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "courses"
  ADD CONSTRAINT "courses_price_non_negative" CHECK ("price_amount" >= 0),
  ADD CONSTRAINT "courses_grade_range" CHECK ("grade" IS NULL OR "grade" BETWEEN 1 AND 11);

ALTER TABLE "curriculum_topics"
  ADD CONSTRAINT "curriculum_topics_grade_range" CHECK ("grade" IS NULL OR "grade" BETWEEN 1 AND 11);

-- Money split must always add up: price = commission + author share.
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_amounts_non_negative"
    CHECK ("price_amount" >= 0 AND "commission_amount" >= 0 AND "author_amount" >= 0),
  ADD CONSTRAINT "order_items_split_matches_price"
    CHECK ("commission_amount" + "author_amount" = "price_amount"),
  ADD CONSTRAINT "order_items_commission_rate_range"
    CHECK ("commission_rate_bps" BETWEEN 0 AND 10000);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_total_non_negative" CHECK ("total_amount" >= 0);

ALTER TABLE "balances"
  ADD CONSTRAINT "balances_non_negative"
    CHECK ("available_amount" >= 0 AND "pending_amount" >= 0 AND "withdrawn_amount" >= 0);

ALTER TABLE "payouts"
  ADD CONSTRAINT "payouts_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_progress_range" CHECK ("progress_percent" BETWEEN 0 AND 100);

ALTER TABLE "quizzes"
  ADD CONSTRAINT "quizzes_pass_score_range" CHECK ("pass_score" BETWEEN 0 AND 100);

-- A category cannot be its own parent.
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_no_self_parent" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");

-- ------------------------------------------------------------------- search
-- Full-text search over the catalog. 'simple' config: Postgres ships no Ukrainian
-- dictionary, and without stemming prefix search is still accurate enough for MVP.
CREATE INDEX "courses_fts_idx" ON "courses"
  USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("short_description", '')));

-- Catalog reads always filter published, non-deleted rows.
CREATE INDEX "courses_published_active_idx" ON "courses" ("published_at" DESC)
  WHERE "status" = 'PUBLISHED' AND "deleted_at" IS NULL;
-- Store the exact moment when an author accepts the content-placement rules.
-- Existing author profiles remain NULL.

ALTER TABLE "author_profiles"
ADD COLUMN "rules_accepted_at" TIMESTAMPTZ(6);

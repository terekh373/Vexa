-- Registration now records the exact moment the user accepted the offer and
-- personal-data/privacy terms. Existing accounts remain nullable because they
-- predate this consent flow.
ALTER TABLE "users"
ADD COLUMN "terms_accepted_at" TIMESTAMPTZ(6);

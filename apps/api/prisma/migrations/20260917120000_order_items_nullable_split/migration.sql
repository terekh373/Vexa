-- The commission split is fixed when the payment is confirmed, not when the
-- order is created. Until then the three columns stay NULL.
ALTER TABLE "order_items" ALTER COLUMN "commission_rate_bps" DROP NOT NULL,
ALTER COLUMN "commission_amount" DROP NOT NULL,
ALTER COLUMN "author_amount" DROP NOT NULL;

-- Either the whole split is known or none of it. The existing checks
-- (non-negative amounts, split equals price, rate range) pass on NULL,
-- so without this constraint a half-filled row would be accepted.
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_split_all_or_none"
    CHECK (num_nulls("commission_rate_bps", "commission_amount", "author_amount") IN (0, 3));

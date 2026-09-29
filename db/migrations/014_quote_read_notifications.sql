ALTER TABLE quotes
  ADD COLUMN customer_seen_revision integer NOT NULL DEFAULT 0
  CHECK (customer_seen_revision >= 0);

ALTER TABLE products
  ADD COLUMN production_min_days integer CHECK (production_min_days BETWEEN 1 AND 60),
  ADD COLUMN production_max_days integer CHECK (production_max_days BETWEEN 1 AND 60),
  ADD COLUMN bulk_threshold integer CHECK (bulk_threshold BETWEEN 2 AND 1000),
  ADD COLUMN bulk_extra_days integer CHECK (bulk_extra_days BETWEEN 1 AND 60),
  ADD CONSTRAINT production_range_valid CHECK (production_min_days IS NULL AND production_max_days IS NULL OR production_min_days IS NOT NULL AND production_max_days >= production_min_days),
  ADD CONSTRAINT bulk_rule_valid CHECK (bulk_threshold IS NULL AND bulk_extra_days IS NULL OR bulk_threshold IS NOT NULL AND bulk_extra_days IS NOT NULL);

ALTER TABLE shipping_zones
  ADD COLUMN transit_min_days integer CHECK (transit_min_days BETWEEN 0 AND 30),
  ADD COLUMN transit_max_days integer CHECK (transit_max_days BETWEEN 0 AND 30),
  ADD CONSTRAINT transit_range_valid CHECK (transit_min_days IS NULL AND transit_max_days IS NULL OR transit_min_days IS NOT NULL AND transit_max_days >= transit_min_days);

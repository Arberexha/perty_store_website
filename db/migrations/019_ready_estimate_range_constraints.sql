ALTER TABLE products DROP CONSTRAINT production_range_valid;
ALTER TABLE products ADD CONSTRAINT production_range_valid CHECK (
  (production_min_days IS NULL AND production_max_days IS NULL)
  OR (production_min_days IS NOT NULL AND production_max_days IS NOT NULL AND production_max_days >= production_min_days)
);

ALTER TABLE shipping_zones DROP CONSTRAINT transit_range_valid;
ALTER TABLE shipping_zones ADD CONSTRAINT transit_range_valid CHECK (
  (transit_min_days IS NULL AND transit_max_days IS NULL)
  OR (transit_min_days IS NOT NULL AND transit_max_days IS NOT NULL AND transit_max_days >= transit_min_days)
);

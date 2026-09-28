ALTER TABLE orders
  ADD COLUMN customer_phone text NOT NULL DEFAULT '',
  ADD COLUMN customer_note text NOT NULL DEFAULT '';

ALTER TABLE order_items
  ADD COLUMN preview_png bytea;

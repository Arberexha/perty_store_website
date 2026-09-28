ALTER TABLE products
  ADD COLUMN design_template text CHECK (design_template IN ('pens', 'shirts', 'hats', 'lighters'));

UPDATE products SET design_template = CASE id
  WHEN 'product-tshirt' THEN 'shirts'
  WHEN 'product-hat' THEN 'hats'
  WHEN 'product-lighter' THEN 'lighters'
END
WHERE id IN ('product-tshirt', 'product-hat', 'product-lighter');

INSERT INTO products (id, category_id, name, slug, description, status, design_template)
VALUES ('product-pen', 'category-accessories', 'Custom pen', 'custom-pen', 'Customer-designed printed pen.', 'published', 'pens')
ON CONFLICT DO NOTHING;

UPDATE products SET status = 'published', updated_at = now()
WHERE id IN ('product-tshirt', 'product-hat', 'product-lighter') AND status = 'draft';

ALTER TABLE design_requests
  ADD COLUMN product_id text REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN product_name text;

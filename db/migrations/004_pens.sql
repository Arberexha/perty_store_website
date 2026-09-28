ALTER TABLE design_requests DROP CONSTRAINT design_requests_product_type_check;

UPDATE design_requests SET product_type = 'pens' WHERE product_type = 'pencils';

ALTER TABLE design_requests
  ADD CONSTRAINT design_requests_product_type_check
  CHECK (product_type IN ('pens', 'shirts', 'hats'));

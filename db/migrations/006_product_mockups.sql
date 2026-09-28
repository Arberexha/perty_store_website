ALTER TABLE products
  ADD COLUMN mockup_image bytea,
  ADD COLUMN mockup_mime text CHECK (mockup_mime IN ('image/png', 'image/jpeg', 'image/webp')),
  ADD COLUMN print_area jsonb,
  ADD CONSTRAINT product_mockup_pair CHECK ((mockup_image IS NULL) = (mockup_mime IS NULL)),
  ADD CONSTRAINT product_print_area_shape CHECK (
    print_area IS NULL OR (
      jsonb_typeof(print_area) = 'object'
      AND print_area ?& ARRAY['left', 'top', 'right', 'bottom']
      AND jsonb_typeof(print_area->'left') = 'number'
      AND jsonb_typeof(print_area->'top') = 'number'
      AND jsonb_typeof(print_area->'right') = 'number'
      AND jsonb_typeof(print_area->'bottom') = 'number'
    )
  );

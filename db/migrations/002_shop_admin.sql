CREATE TABLE categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  age_restricted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id text PRIMARY KEY,
  category_id text NOT NULL REFERENCES categories(id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  ordering_enabled boolean NOT NULL DEFAULT false,
  age_restricted boolean NOT NULL DEFAULT false,
  minimum_quantity integer NOT NULL DEFAULT 1 CHECK (minimum_quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restricted_products_not_orderable CHECK (NOT (age_restricted AND ordering_enabled))
);

CREATE INDEX products_category_id_idx ON products(category_id);

CREATE TABLE product_variants (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL UNIQUE,
  label text NOT NULL,
  size text NOT NULL DEFAULT '',
  material text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  base_price_cents integer CHECK (base_price_cents >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_variants_product_id_idx ON product_variants(product_id);

CREATE TABLE quantity_price_tiers (
  id text PRIMARY KEY,
  variant_id text NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  minimum_quantity integer NOT NULL CHECK (minimum_quantity > 1),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  UNIQUE (variant_id, minimum_quantity)
);

CREATE TABLE artwork_files (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  original_name text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX artwork_files_user_id_idx ON artwork_files(user_id);

CREATE TABLE quotes (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'sent', 'accepted', 'declined')),
  amount_cents integer CHECK (amount_cents >= 0),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pickup_locations (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  opening_hours text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shipping_zones (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  fee_cents integer NOT NULL CHECK (fee_cents >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_production', 'ready', 'shipped', 'completed', 'cancelled')),
  fulfillment_method text NOT NULL CHECK (fulfillment_method IN ('pickup', 'delivery')),
  pickup_location_id text REFERENCES pickup_locations(id) ON DELETE SET NULL,
  shipping_address text,
  shipping_zone_id text REFERENCES shipping_zones(id) ON DELETE SET NULL,
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_id_idx ON orders(user_id);
CREATE INDEX orders_created_at_idx ON orders(created_at DESC);

CREATE TABLE order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id text REFERENCES products(id) ON DELETE SET NULL,
  variant_id text REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_label text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents integer NOT NULL CHECK (line_total_cents >= 0),
  design_data jsonb,
  preview_storage_key text
);

CREATE TABLE payments (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_reference text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_order_id_idx ON payments(order_id);

CREATE TABLE admin_audit_log (
  id text PRIMARY KEY,
  actor_user_id text REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_created_at_idx ON admin_audit_log(created_at DESC);

INSERT INTO categories (id, name, slug, age_restricted) VALUES
  ('category-apparel', 'Apparel', 'apparel', false),
  ('category-accessories', 'Accessories', 'accessories', false),
  ('category-lighters', 'Lighters (18+)', 'lighters', true);

INSERT INTO products (id, category_id, name, slug, description, age_restricted) VALUES
  ('product-tshirt', 'category-apparel', 'Custom T-shirt', 'custom-tshirt', 'Customer-designed printed T-shirt.', false),
  ('product-hat', 'category-accessories', 'Custom hat', 'custom-hat', 'Customer-designed printed hat.', false),
  ('product-lighter', 'category-lighters', 'Custom lighter (18+)', 'custom-lighter', 'Age-restricted informational category. Not available for online ordering.', true);

CREATE TABLE saved_designs (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id text REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_slug text NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  design_data jsonb NOT NULL,
  preview_png bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX saved_designs_user_updated_idx ON saved_designs(user_id, updated_at DESC);

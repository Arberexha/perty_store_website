CREATE TABLE design_requests (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  product_type text NOT NULL CHECK (product_type IN ('pencils', 'shirts', 'hats')),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL DEFAULT '',
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000),
  notes text NOT NULL DEFAULT '',
  product_color text NOT NULL CHECK (product_color ~ '^#[0-9A-Fa-f]{6}$'),
  design_data jsonb NOT NULL,
  preview_png bytea NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'quoted', 'closed', 'cancelled')),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX design_requests_created_at_idx ON design_requests(created_at DESC);
CREATE INDEX design_requests_user_id_idx ON design_requests(user_id);

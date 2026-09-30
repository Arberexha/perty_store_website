ALTER TABLE orders ADD COLUMN admin_viewed_at timestamptz;

UPDATE orders SET admin_viewed_at = created_at;

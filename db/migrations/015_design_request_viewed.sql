ALTER TABLE design_requests ADD COLUMN admin_viewed_at timestamptz;

UPDATE design_requests SET admin_viewed_at = created_at;

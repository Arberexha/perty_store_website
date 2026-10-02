ALTER TABLE orders ADD COLUMN tracking_token text NOT NULL DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
CREATE UNIQUE INDEX orders_tracking_token_idx ON orders(tracking_token);

ALTER TABLE orders ADD COLUMN status_email_status text NOT NULL DEFAULT 'not_requested';
ALTER TABLE orders ADD COLUMN status_email_sent_at timestamptz;

CREATE TABLE order_status_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('new', 'in_production', 'ready', 'shipped', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_events_order_id_idx ON order_status_events(order_id, id);

INSERT INTO order_status_events (order_id, status, created_at)
SELECT id, 'new', created_at FROM orders;
INSERT INTO order_status_events (order_id, status, created_at)
SELECT id, status, updated_at FROM orders WHERE status <> 'new';

CREATE FUNCTION record_order_status_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_events (order_id, status) VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_status_event_after_insert AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION record_order_status_event();
CREATE TRIGGER orders_status_event_after_status_update AFTER UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION record_order_status_event();

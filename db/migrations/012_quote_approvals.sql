ALTER TABLE quotes
  ADD COLUMN design_request_id text UNIQUE REFERENCES design_requests(id) ON DELETE SET NULL,
  ADD COLUMN customer_note text NOT NULL DEFAULT '',
  ADD COLUMN revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  ADD COLUMN sent_at timestamptz,
  ADD COLUMN responded_at timestamptz,
  ADD COLUMN order_id text UNIQUE REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN notification_email_status text NOT NULL DEFAULT 'not_requested'
    CHECK (notification_email_status IN ('not_requested', 'pending', 'sent', 'failed', 'not_configured'));

ALTER TABLE quotes DROP CONSTRAINT quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('new', 'reviewing', 'sent', 'changes_requested', 'accepted', 'declined'));

CREATE INDEX quotes_user_status_idx ON quotes(user_id, status, created_at DESC);

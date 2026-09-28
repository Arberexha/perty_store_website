ALTER TABLE orders
  ADD COLUMN cancellation_email_status text NOT NULL DEFAULT 'not_requested'
    CHECK (cancellation_email_status IN ('not_requested', 'pending', 'sent', 'failed', 'not_configured')),
  ADD COLUMN cancellation_email_sent_at timestamptz;

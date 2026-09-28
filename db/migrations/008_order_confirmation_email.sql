ALTER TABLE orders
  ADD COLUMN confirmation_email_status text NOT NULL DEFAULT 'not_configured'
    CHECK (confirmation_email_status IN ('pending', 'sent', 'failed', 'not_configured')),
  ADD COLUMN confirmation_email_sent_at timestamptz;

-- Add budget alert columns to brands table
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS monthly_budget_limit NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS budget_alert_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS budget_alert_80_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS budget_alert_100_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN brands.monthly_budget_limit IS 'Optional monthly budget limit in dollars for alerting';
COMMENT ON COLUMN brands.budget_alert_enabled IS 'Whether budget alerts are enabled';
COMMENT ON COLUMN brands.budget_alert_80_sent_at IS 'Timestamp when 80% budget alert was sent this month';
COMMENT ON COLUMN brands.budget_alert_100_sent_at IS 'Timestamp when 100% budget alert was sent this month';

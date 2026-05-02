-- Add recurring-related fields to hub_jobs so we have one canonical source of truth.
-- Display layer never has to compute these — the sync grabs them once.

ALTER TABLE hub_jobs ADD COLUMN IF NOT EXISTS frequency_label text;
ALTER TABLE hub_jobs ADD COLUMN IF NOT EXISTS visits_per_month numeric;
ALTER TABLE hub_jobs ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE hub_jobs ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE hub_jobs ADD COLUMN IF NOT EXISTS calendar_rule text;

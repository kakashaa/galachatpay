ALTER TABLE works_members ADD COLUMN IF NOT EXISTS monthly_charges numeric DEFAULT 0;
ALTER TABLE works_members ADD COLUMN IF NOT EXISTS commission numeric DEFAULT 0;

-- Add status columns to entry_gift_claims
ALTER TABLE entry_gift_claims ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE entry_gift_claims ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE entry_gift_claims ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE entry_gift_claims ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE entry_gift_claims ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE entry_gift_claims ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 30;
ALTER TABLE entry_gift_claims ADD COLUMN IF NOT EXISTS ware_type text DEFAULT 'entry_profile';

-- Add status columns to frame_claims
ALTER TABLE frame_claims ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE frame_claims ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE frame_claims ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE frame_claims ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE frame_claims ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE frame_claims ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 30;

-- Update existing rows to approved (they were auto-approved before)
UPDATE entry_gift_claims SET status = 'approved' WHERE status IS NULL;
UPDATE frame_claims SET status = 'approved' WHERE status IS NULL;

-- Add update RLS policy for entry_gift_claims (needed for admin updates via service role)
CREATE POLICY "Service role can update entry_gift_claims" ON entry_gift_claims FOR UPDATE TO service_role USING (true);

-- Add update RLS policy for frame_claims
CREATE POLICY "Service role can update frame_claims" ON frame_claims FOR UPDATE TO service_role USING (true);


-- Add last_processed_diamonds to track the last synced diamond value for agency members
ALTER TABLE public.bd_members ADD COLUMN IF NOT EXISTS last_processed_diamonds numeric NOT NULL DEFAULT 0;

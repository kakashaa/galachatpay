
-- Add initial_charger_num column to store the charger level when supporter joins
ALTER TABLE public.bd_members ADD COLUMN IF NOT EXISTS initial_charger_num bigint NOT NULL DEFAULT 0;

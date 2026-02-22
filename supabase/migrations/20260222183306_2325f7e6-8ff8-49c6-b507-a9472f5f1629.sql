
-- Add external profit columns to bd_commission_settings
ALTER TABLE public.bd_commission_settings
ADD COLUMN IF NOT EXISTS external_total_profit numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS external_available_profit numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS external_pending_profit numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS external_profit_status text NOT NULL DEFAULT 'no_change',
ADD COLUMN IF NOT EXISTS external_profit_difference numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS external_last_update text;

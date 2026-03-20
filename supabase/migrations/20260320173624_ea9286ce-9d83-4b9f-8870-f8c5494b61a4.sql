
-- Add new columns to supporter_tiers for V2 dual validity
ALTER TABLE public.supporter_tiers ADD COLUMN IF NOT EXISTS use_validity_days integer DEFAULT 15;

-- Add new columns to supporter_rewards for V2
ALTER TABLE public.supporter_rewards ADD COLUMN IF NOT EXISTS item_duration_days integer;
ALTER TABLE public.supporter_rewards ADD COLUMN IF NOT EXISTS used_for_uuid text;
ALTER TABLE public.supporter_rewards ADD COLUMN IF NOT EXISTS use_expires_at timestamptz;
ALTER TABLE public.supporter_rewards ADD COLUMN IF NOT EXISTS item_expires_at timestamptz;

-- Add new columns to supporter_settings for V2
ALTER TABLE public.supporter_settings ADD COLUMN IF NOT EXISTS default_use_validity_days integer DEFAULT 15;
ALTER TABLE public.supporter_settings ADD COLUMN IF NOT EXISTS coins_mode text DEFAULT 'auto';
ALTER TABLE public.supporter_settings ADD COLUMN IF NOT EXISTS notify_whatsapp boolean DEFAULT true;
ALTER TABLE public.supporter_settings ADD COLUMN IF NOT EXISTS reminder_days_before integer DEFAULT 3;

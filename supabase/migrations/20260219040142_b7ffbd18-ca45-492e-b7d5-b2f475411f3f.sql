
-- Add missing columns to bd_commission_settings
ALTER TABLE bd_commission_settings 
ADD COLUMN IF NOT EXISTS current_month_earnings numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add missing columns to bd_members
ALTER TABLE bd_members
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_daily_charges bigint NOT NULL DEFAULT 0;

-- Add terms_accepted to invitations
ALTER TABLE bd_member_invitations
ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false;

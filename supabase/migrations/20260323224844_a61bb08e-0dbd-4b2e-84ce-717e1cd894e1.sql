ALTER TABLE public.supporter_challenge_progress 
ADD COLUMN IF NOT EXISTS base_charges numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_claimed boolean DEFAULT false;
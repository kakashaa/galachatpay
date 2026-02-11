
-- Table to store star cashout codes
CREATE TABLE public.star_cashout_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  user_uuid text NOT NULL,
  user_name text NOT NULL,
  stars_amount integer NOT NULL,
  usd_amount numeric NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  used_in_request_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.star_cashout_codes ENABLE ROW LEVEL SECURITY;

-- Users can insert their own codes
CREATE POLICY "Users can insert own cashout codes"
ON public.star_cashout_codes FOR INSERT
WITH CHECK (true);

-- Users can read codes
CREATE POLICY "Users can read cashout codes"
ON public.star_cashout_codes FOR SELECT
USING (true);

-- Users can update codes (mark as used)
CREATE POLICY "Users can update cashout codes"
ON public.star_cashout_codes FOR UPDATE
USING (true);

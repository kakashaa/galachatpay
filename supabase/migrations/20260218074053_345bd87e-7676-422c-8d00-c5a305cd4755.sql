
-- Table to track all used charge IDs to prevent reuse
CREATE TABLE public.used_charge_ids (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  charge_id text NOT NULL,
  user_uuid text NOT NULL,
  amount_usd numeric NOT NULL,
  salary_request_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint on charge_id to prevent duplicates
CREATE UNIQUE INDEX idx_used_charge_ids_unique ON public.used_charge_ids (charge_id);

-- Index for fast lookups by user
CREATE INDEX idx_used_charge_ids_user ON public.used_charge_ids (user_uuid);

-- Enable RLS
ALTER TABLE public.used_charge_ids ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/read
CREATE POLICY "Service role full access on used_charge_ids"
  ON public.used_charge_ids FOR ALL USING (true) WITH CHECK (true);

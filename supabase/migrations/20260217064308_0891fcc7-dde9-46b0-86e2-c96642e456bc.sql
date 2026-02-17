
-- Table for custom VIP gifting limits per agent
CREATE TABLE public.agent_vip_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_uuid text NOT NULL UNIQUE,
  agent_name text NOT NULL DEFAULT '',
  vip4_limit integer NOT NULL DEFAULT 5,
  vip5_limit integer NOT NULL DEFAULT 5,
  vip6_limit integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_vip_overrides ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read agent_vip_overrides"
  ON public.agent_vip_overrides FOR SELECT USING (true);

CREATE POLICY "Service role can insert agent_vip_overrides"
  ON public.agent_vip_overrides FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update agent_vip_overrides"
  ON public.agent_vip_overrides FOR UPDATE USING (true);

CREATE POLICY "Service role can delete agent_vip_overrides"
  ON public.agent_vip_overrides FOR DELETE USING (true);

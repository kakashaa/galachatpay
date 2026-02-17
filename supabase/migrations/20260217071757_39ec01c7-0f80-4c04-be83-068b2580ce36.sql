-- Fix default values for agent_vip_overrides to match intended limits
ALTER TABLE public.agent_vip_overrides ALTER COLUMN vip4_limit SET DEFAULT 3;
ALTER TABLE public.agent_vip_overrides ALTER COLUMN vip5_limit SET DEFAULT 2;

-- Update existing records that still have the old wrong defaults (5/5)
UPDATE public.agent_vip_overrides SET vip4_limit = 3 WHERE vip4_limit = 5;
UPDATE public.agent_vip_overrides SET vip5_limit = 2 WHERE vip5_limit = 5;
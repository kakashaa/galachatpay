
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can read bd_commission_settings" ON public.bd_commission_settings;

-- Block direct reads from anon/authenticated - force through service_role (edge functions)
CREATE POLICY "Service role can read all bd_commission_settings"
ON public.bd_commission_settings
FOR SELECT
TO service_role
USING (true);

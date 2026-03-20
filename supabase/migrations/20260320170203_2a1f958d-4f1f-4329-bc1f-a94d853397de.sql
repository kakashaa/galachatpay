
-- Portal bans table for gateway-level banning
CREATE TABLE IF NOT EXISTS public.portal_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid text NOT NULL,
  ban_type text NOT NULL, -- 'full' or 'service'
  service text, -- null if full ban; e.g. 'salary', 'vip', 'id_change'
  duration text,
  reason text,
  banned_by text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.portal_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read portal_bans" ON public.portal_bans FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert portal_bans" ON public.portal_bans FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update portal_bans" ON public.portal_bans FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete portal_bans" ON public.portal_bans FOR DELETE TO public USING (true);

-- Add supporter/agent separate commission rates to app_settings defaults
INSERT INTO public.app_settings (key, value) VALUES ('global_supporter_commission_pct', '2') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('global_agent_commission_pct', '3') ON CONFLICT (key) DO NOTHING;

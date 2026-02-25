
-- Table to track manual bans from admin dashboard
CREATE TABLE public.manual_bans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_uuid text NOT NULL,
  ban_type text NOT NULL DEFAULT 'normal',
  duration_hours integer NOT NULL DEFAULT 24,
  reason text DEFAULT '',
  banned_by text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  unbanned_at timestamp with time zone,
  unbanned_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read manual_bans" ON public.manual_bans FOR SELECT USING (true);
CREATE POLICY "Service role can insert manual_bans" ON public.manual_bans FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update manual_bans" ON public.manual_bans FOR UPDATE USING (true);
CREATE POLICY "Service role can delete manual_bans" ON public.manual_bans FOR DELETE USING (true);


CREATE TABLE IF NOT EXISTS public.works_abuse_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  action text NOT NULL,
  reason text,
  attempt_number int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.works_abuse_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "works_abuse_log_public_access" ON public.works_abuse_log FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.works_ban_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  reason text,
  attempts int DEFAULT 0,
  status text DEFAULT 'pending',
  reviewed_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.works_ban_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "works_ban_requests_public_access" ON public.works_ban_requests FOR ALL USING (true) WITH CHECK (true);

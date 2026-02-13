
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_username text NOT NULL,
  admin_role text NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on admin_audit_log"
ON public.admin_audit_log
FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX idx_audit_log_created ON public.admin_audit_log(created_at DESC);


-- Table to track failed login attempts and blocks
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_uuid text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  block_count integer NOT NULL DEFAULT 0,
  blocked_until timestamp with time zone,
  is_permanently_blocked boolean NOT NULL DEFAULT false,
  admin_unblocked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(target_uuid)
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Edge functions (service role) can do everything
CREATE POLICY "Service role full access on login_attempts"
ON public.login_attempts FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_login_attempts_updated_at
BEFORE UPDATE ON public.login_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_salary_requests_updated_at();

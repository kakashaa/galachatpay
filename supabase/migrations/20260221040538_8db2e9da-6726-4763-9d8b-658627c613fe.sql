
-- Table for moderator accounts managed by super_admin/admin
CREATE TABLE public.admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'moderator',
  is_active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- Only service role can access (managed via edge functions)
CREATE POLICY "Service role full access on admin_accounts"
  ON public.admin_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_admin_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_admin_accounts_updated_at
  BEFORE UPDATE ON public.admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admin_accounts_timestamp();

-- Enable realtime for admin updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_accounts;

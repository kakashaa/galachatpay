
-- Table to log account type changes
CREATE TABLE public.account_type_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  old_type integer NOT NULL,
  new_type integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_type_changes ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (from client side)
CREATE POLICY "Anyone can insert account_type_changes"
ON public.account_type_changes FOR INSERT
WITH CHECK (true);

-- Anyone can read (for admin dashboard)
CREATE POLICY "Anyone can read account_type_changes"
ON public.account_type_changes FOR SELECT
USING (true);

-- Enable realtime for admin dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.account_type_changes;

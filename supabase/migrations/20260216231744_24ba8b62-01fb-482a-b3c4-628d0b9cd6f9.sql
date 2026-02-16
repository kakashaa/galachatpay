
-- Table for BD member invitations (pending approval by target user)
CREATE TABLE public.bd_member_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bd_uuid text NOT NULL,
  bd_name text NOT NULL DEFAULT '',
  bd_referral_code text NOT NULL DEFAULT '',
  member_uuid text NOT NULL,
  member_name text NOT NULL DEFAULT '',
  member_type text NOT NULL DEFAULT 'supporter',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bd_member_invitations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read bd_member_invitations"
  ON public.bd_member_invitations FOR SELECT USING (true);

CREATE POLICY "Service role can insert bd_member_invitations"
  ON public.bd_member_invitations FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update bd_member_invitations"
  ON public.bd_member_invitations FOR UPDATE USING (true);

CREATE POLICY "Service role can delete bd_member_invitations"
  ON public.bd_member_invitations FOR DELETE USING (true);

-- Enable realtime for invitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.bd_member_invitations;

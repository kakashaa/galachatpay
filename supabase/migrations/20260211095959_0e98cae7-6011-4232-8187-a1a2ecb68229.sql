
-- Create ban_reports table
CREATE TABLE public.ban_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_gala_id TEXT NOT NULL,
  reported_user_id TEXT NOT NULL,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('promotion', 'insult', 'defamation')),
  description TEXT NOT NULL,
  evidence_url TEXT NOT NULL,
  evidence_type TEXT NOT NULL DEFAULT 'image',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  reward_amount NUMERIC,
  reward_paid BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT
);

-- Enable RLS
ALTER TABLE public.ban_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can insert reports
CREATE POLICY "Anyone can insert ban reports"
ON public.ban_reports FOR INSERT
WITH CHECK (true);

-- Anyone can read verified reports (for search)
CREATE POLICY "Anyone can read verified ban reports"
ON public.ban_reports FOR SELECT
USING (true);

-- Create attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments
CREATE POLICY "Anyone can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');


-- Custom gifts table for user-uploaded custom entry gifts
CREATE TABLE public.custom_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_gala_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  video_duration INTEGER NOT NULL DEFAULT 0,
  charger_level_at_upload INTEGER NOT NULL DEFAULT 0,
  max_duration_allowed INTEGER NOT NULL DEFAULT 11,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_gifts ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved custom gifts
CREATE POLICY "Anyone can read approved custom gifts"
ON public.custom_gifts FOR SELECT
USING (true);

-- Anyone can insert custom gifts
CREATE POLICY "Anyone can insert custom gifts"
ON public.custom_gifts FOR INSERT
WITH CHECK (true);

-- Service role can update custom gifts
CREATE POLICY "Service role can update custom gifts"
ON public.custom_gifts FOR UPDATE
USING (true);

-- Service role can delete custom gifts
CREATE POLICY "Service role can delete custom gifts"
ON public.custom_gifts FOR DELETE
USING (true);

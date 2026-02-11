
CREATE TABLE public.video_tutorials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active video tutorials"
ON public.video_tutorials FOR SELECT
USING (true);

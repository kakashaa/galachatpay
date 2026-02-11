
CREATE TABLE public.animated_photo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  user_name TEXT NOT NULL,
  gif_url TEXT NOT NULL,
  description TEXT,
  duration_label TEXT NOT NULL,
  max_level INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Each user can only have ONE request
CREATE UNIQUE INDEX idx_animated_photo_one_per_user ON public.animated_photo_requests (user_uuid);

ALTER TABLE public.animated_photo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read animated photo requests" ON public.animated_photo_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert animated photo requests" ON public.animated_photo_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update animated photo requests" ON public.animated_photo_requests FOR UPDATE USING (true);


-- Create frames table (similar to entry_gifts but for profile frames)
CREATE TABLE public.frames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT NULL,
  star_level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read active frames" ON public.frames FOR SELECT USING (true);
CREATE POLICY "Service role can insert frames" ON public.frames FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update frames" ON public.frames FOR UPDATE USING (true);
CREATE POLICY "Service role can delete frames" ON public.frames FOR DELETE USING (true);

-- Frame claims table
CREATE TABLE public.frame_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  frame_id UUID NOT NULL REFERENCES public.frames(id),
  claim_type TEXT NOT NULL, -- 'self' or 'friend'
  friend_uuid TEXT DEFAULT NULL,
  claim_month TEXT NOT NULL,
  charger_level_at_claim INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.frame_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read claims" ON public.frame_claims FOR SELECT USING (true);
CREATE POLICY "Anyone can insert claims" ON public.frame_claims FOR INSERT WITH CHECK (true);

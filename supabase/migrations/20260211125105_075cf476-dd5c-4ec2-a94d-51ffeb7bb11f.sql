
-- Create entry_gifts table for entry animations/gifts
CREATE TABLE public.entry_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT NULL,
  gift_type TEXT NOT NULL DEFAULT 'both' CHECK (gift_type IN ('profile', 'room', 'both')),
  star_level INTEGER NOT NULL DEFAULT 1 CHECK (star_level BETWEEN 1 AND 3),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entry_gifts ENABLE ROW LEVEL SECURITY;

-- Everyone can read active entry gifts
CREATE POLICY "Anyone can read entry gifts"
ON public.entry_gifts FOR SELECT
USING (true);

-- Service role can manage
CREATE POLICY "Service role can insert entry gifts"
ON public.entry_gifts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update entry gifts"
ON public.entry_gifts FOR UPDATE
USING (true);

CREATE POLICY "Service role can delete entry gifts"
ON public.entry_gifts FOR DELETE
USING (true);

-- Create entry_gift_claims table to track user claims
CREATE TABLE public.entry_gift_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  gift_id UUID NOT NULL REFERENCES public.entry_gifts(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('self', 'friend')),
  friend_uuid TEXT NULL,
  gift_usage TEXT NOT NULL CHECK (gift_usage IN ('profile', 'room')),
  claim_month TEXT NOT NULL, -- format: YYYY-MM
  charger_level_at_claim INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.entry_gift_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read claims"
ON public.entry_gift_claims FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert claims"
ON public.entry_gift_claims FOR INSERT
WITH CHECK (true);

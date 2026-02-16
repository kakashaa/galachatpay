
-- Create hairs table for storing hair SVGA assets
CREATE TABLE public.hairs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  file_url text NOT NULL,
  thumbnail_url text NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hairs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read active hairs" ON public.hairs FOR SELECT USING (true);
CREATE POLICY "Service role can insert hairs" ON public.hairs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update hairs" ON public.hairs FOR UPDATE USING (true);
CREATE POLICY "Service role can delete hairs" ON public.hairs FOR DELETE USING (true);

-- Create hair_selections table for user weekly selections
CREATE TABLE public.hair_selections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid text NOT NULL,
  hair_id uuid NOT NULL REFERENCES public.hairs(id),
  selection_week text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hair_selections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read hair selections" ON public.hair_selections FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hair selections" ON public.hair_selections FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete own hair selections" ON public.hair_selections FOR DELETE USING (true);

-- Enable realtime for hairs
ALTER PUBLICATION supabase_realtime ADD TABLE public.hairs;

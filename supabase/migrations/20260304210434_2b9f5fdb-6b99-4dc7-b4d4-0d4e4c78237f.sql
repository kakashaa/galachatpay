CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Service role can insert banners" ON public.banners FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update banners" ON public.banners FOR UPDATE USING (true);
CREATE POLICY "Service role can delete banners" ON public.banners FOR DELETE USING (true);
CREATE TABLE IF NOT EXISTS public.verified_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  phone text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verified_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verified_phones" ON public.verified_phones FOR SELECT USING (true);
CREATE POLICY "Anyone can insert verified_phones" ON public.verified_phones FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update verified_phones" ON public.verified_phones FOR UPDATE USING (true);
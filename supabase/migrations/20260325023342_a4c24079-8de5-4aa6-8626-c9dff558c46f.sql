CREATE TABLE IF NOT EXISTS public.whatsapp_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid text NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read whatsapp_verifications" ON public.whatsapp_verifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert whatsapp_verifications" ON public.whatsapp_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update whatsapp_verifications" ON public.whatsapp_verifications FOR UPDATE USING (true);

CREATE TABLE IF NOT EXISTS public.user_whatsapp (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  country_code text NOT NULL,
  verified_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read user_whatsapp" ON public.user_whatsapp FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_whatsapp" ON public.user_whatsapp FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user_whatsapp" ON public.user_whatsapp FOR UPDATE USING (true);

-- Room background requests table
CREATE TABLE public.room_background_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  user_name text DEFAULT '',
  request_type text NOT NULL, -- 'self', 'gift_create', 'gift_redeem'
  gift_code text,
  image_url text,
  status text DEFAULT 'pending', -- pending, approved, rejected
  admin_note text,
  month text NOT NULL, -- '2026-03'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.room_background_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert room_background_requests" ON public.room_background_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read room_background_requests" ON public.room_background_requests FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update room_background_requests" ON public.room_background_requests FOR UPDATE TO public USING (true);

-- Room background gift codes table
CREATE TABLE public.room_background_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  creator_uuid text NOT NULL,
  used_by_uuid text,
  used_at timestamptz,
  month text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.room_background_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert room_background_codes" ON public.room_background_codes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read room_background_codes" ON public.room_background_codes FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update room_background_codes" ON public.room_background_codes FOR UPDATE TO public USING (true);

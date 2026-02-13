
-- Create VIP requests tracking table
CREATE TABLE public.vip_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  vip_level INTEGER NOT NULL,
  request_month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one VIP request per user per month
ALTER TABLE public.vip_requests ADD CONSTRAINT unique_user_vip_per_month UNIQUE (user_uuid, request_month);

-- Enable RLS
ALTER TABLE public.vip_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read vip requests" ON public.vip_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert vip requests" ON public.vip_requests FOR INSERT WITH CHECK (true);

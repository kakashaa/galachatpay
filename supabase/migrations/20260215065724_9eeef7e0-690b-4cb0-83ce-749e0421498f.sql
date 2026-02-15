
-- Create quick_support_requests table
CREATE TABLE public.quick_support_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  request_type TEXT NOT NULL, -- 'admin_visit', 'report', 'complaint', 'direct_contact'
  room_code TEXT,
  description TEXT,
  phone_number TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_support_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert
CREATE POLICY "Anyone can insert quick_support_requests"
ON public.quick_support_requests
FOR INSERT
WITH CHECK (true);

-- Anyone can read (for admin dashboard)
CREATE POLICY "Anyone can read quick_support_requests"
ON public.quick_support_requests
FOR SELECT
USING (true);

-- Service role can update
CREATE POLICY "Service role can update quick_support_requests"
ON public.quick_support_requests
FOR UPDATE
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_support_requests;

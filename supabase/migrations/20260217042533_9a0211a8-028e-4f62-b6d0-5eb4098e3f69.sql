
-- Table for BD registration requests (users under level 10)
CREATE TABLE public.bd_registration_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  user_level integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bd_registration_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read bd_registration_requests" ON public.bd_registration_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bd_registration_requests" ON public.bd_registration_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update bd_registration_requests" ON public.bd_registration_requests FOR UPDATE USING (true);
CREATE POLICY "Service role can delete bd_registration_requests" ON public.bd_registration_requests FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bd_registration_requests;


-- Create salary requests table
CREATE TABLE public.salary_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('monthly', 'instant')),
  amount_usd NUMERIC NOT NULL,
  amount_coins NUMERIC,
  recipient_name TEXT NOT NULL,
  recipient_country TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  transfer_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salary_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (users auth via gala, not supabase auth)
CREATE POLICY "Anyone can insert requests"
  ON public.salary_requests FOR INSERT
  WITH CHECK (true);

-- Allow users to read their own requests by uuid
CREATE POLICY "Users can read own requests"
  ON public.salary_requests FOR SELECT
  USING (true);

-- Allow updates (for admin to update status/image)
CREATE POLICY "Allow updates"
  ON public.salary_requests FOR UPDATE
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_salary_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_salary_requests_updated_at
  BEFORE UPDATE ON public.salary_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_salary_requests_updated_at();

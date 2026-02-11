
-- Create user_star_balance table for the new star system
CREATE TABLE public.user_star_balance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  current_month TEXT NOT NULL,
  monthly_stars INTEGER NOT NULL DEFAULT 0,
  carryover_stars INTEGER NOT NULL DEFAULT 0,
  total_stars INTEGER NOT NULL DEFAULT 0,
  last_level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_uuid, current_month)
);

-- Enable RLS
ALTER TABLE public.user_star_balance ENABLE ROW LEVEL SECURITY;

-- Anyone can read and insert their own star balance
CREATE POLICY "Users can read own star balance" 
ON public.user_star_balance 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert own star balance" 
ON public.user_star_balance 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update own star balance" 
ON public.user_star_balance 
FOR UPDATE 
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_star_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for updated_at
CREATE TRIGGER update_user_star_balance_updated_at
BEFORE UPDATE ON public.user_star_balance
FOR EACH ROW
EXECUTE FUNCTION public.update_user_star_balance_timestamp();

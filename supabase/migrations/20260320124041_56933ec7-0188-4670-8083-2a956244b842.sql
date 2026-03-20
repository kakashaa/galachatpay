ALTER TABLE public.salary_requests 
  ADD COLUMN IF NOT EXISTS target_uuid text,
  ADD COLUMN IF NOT EXISTS target_name text;

-- Add rejection columns to salary_requests
ALTER TABLE public.salary_requests 
  ADD COLUMN IF NOT EXISTS rejection_image_url text,
  ADD COLUMN IF NOT EXISTS is_final_rejection boolean NOT NULL DEFAULT false;

-- Add rejection columns to animated_photo_requests
ALTER TABLE public.animated_photo_requests 
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS rejection_image_url text,
  ADD COLUMN IF NOT EXISTS is_final_rejection boolean NOT NULL DEFAULT false;

-- Add rejection columns to custom_gifts
ALTER TABLE public.custom_gifts 
  ADD COLUMN IF NOT EXISTS rejection_image_url text,
  ADD COLUMN IF NOT EXISTS is_final_rejection boolean NOT NULL DEFAULT false;

-- Add rejection columns to bd_requests_cache
ALTER TABLE public.bd_requests_cache 
  ADD COLUMN IF NOT EXISTS rejection_image_url text,
  ADD COLUMN IF NOT EXISTS is_final_rejection boolean NOT NULL DEFAULT false;

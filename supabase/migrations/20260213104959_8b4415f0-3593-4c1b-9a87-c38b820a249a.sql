
-- Add type_user column to vip_requests table
ALTER TABLE public.vip_requests ADD COLUMN type_user INTEGER DEFAULT 0;

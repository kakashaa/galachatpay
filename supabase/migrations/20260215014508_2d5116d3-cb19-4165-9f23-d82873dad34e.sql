
-- Drop the old unique constraint that prevents multiple VIP requests per month
-- (agents need multiple requests, validation is handled in edge function)
ALTER TABLE public.vip_requests DROP CONSTRAINT unique_user_vip_per_month;

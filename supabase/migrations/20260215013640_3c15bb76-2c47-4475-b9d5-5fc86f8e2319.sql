
-- Add recipient_uuid column to track VIP gifts
ALTER TABLE public.vip_requests ADD COLUMN recipient_uuid text DEFAULT NULL;

-- Add index for efficient gift lookups
CREATE INDEX idx_vip_requests_recipient ON public.vip_requests (user_uuid, recipient_uuid, request_month);

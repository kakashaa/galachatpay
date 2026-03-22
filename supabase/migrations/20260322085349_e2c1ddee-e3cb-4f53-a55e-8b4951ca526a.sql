-- Remove old constraint
ALTER TABLE public.salary_requests DROP CONSTRAINT IF EXISTS salary_requests_request_type_check;

-- Add new constraint with all withdrawal types
ALTER TABLE public.salary_requests ADD CONSTRAINT salary_requests_request_type_check 
  CHECK (request_type = ANY (ARRAY[
    'monthly', 'instant', 'star_code',
    'agency_cash', 'agency_coins', 'agency_transfer',
    'charge_self', 'charge_other', 'cash'
  ]));

-- Add missing columns if not exist
ALTER TABLE public.salary_requests 
  ADD COLUMN IF NOT EXISTS transfer_id text,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS transaction_date timestamptz,
  ADD COLUMN IF NOT EXISTS target_uuid text,
  ADD COLUMN IF NOT EXISTS target_name text,
  ADD COLUMN IF NOT EXISTS rejection_image_url text;
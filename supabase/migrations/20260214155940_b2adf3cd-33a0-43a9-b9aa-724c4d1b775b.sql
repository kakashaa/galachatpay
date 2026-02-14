
-- Add transaction_id and transaction_date columns to salary_requests
ALTER TABLE public.salary_requests ADD COLUMN transaction_id text DEFAULT NULL;
ALTER TABLE public.salary_requests ADD COLUMN transaction_date text DEFAULT NULL;

-- Create unique index on transaction_id to prevent duplicates (only for non-null values)
CREATE UNIQUE INDEX idx_salary_requests_transaction_id ON public.salary_requests (transaction_id) WHERE transaction_id IS NOT NULL;

-- Re-add unique index on transaction_id to prevent duplicate charge_id usage
CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_requests_unique_transaction_id
ON public.salary_requests (transaction_id)
WHERE transaction_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
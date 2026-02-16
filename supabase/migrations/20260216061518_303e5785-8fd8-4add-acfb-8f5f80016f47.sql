-- Remove the unique index on transaction_id since the API returns the same transaction_id for same uuid+amount
DROP INDEX IF EXISTS idx_salary_requests_unique_transaction_id;

NOTIFY pgrst, 'reload schema';
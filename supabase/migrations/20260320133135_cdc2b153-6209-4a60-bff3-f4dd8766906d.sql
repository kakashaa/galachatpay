-- 1) Add durable transfer identifier for one-time usage checks
ALTER TABLE public.salary_requests
ADD COLUMN IF NOT EXISTS transfer_id text;

-- 2) Backfill old records so existing requests are protected too
UPDATE public.salary_requests
SET transfer_id = transaction_id
WHERE transfer_id IS NULL
  AND transaction_id IS NOT NULL;

-- 3) Add lookup index for transfer filtering/checks
CREATE INDEX IF NOT EXISTS idx_salary_requests_user_transfer_status
ON public.salary_requests (user_uuid, transfer_id, status)
WHERE transfer_id IS NOT NULL;

-- 4) Enforce one-time usage per user for non-rejected requests at DB layer
CREATE OR REPLACE FUNCTION public.enforce_salary_transfer_single_use()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.transfer_id IS NULL OR btrim(NEW.transfer_id) = '' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.status, 'pending') <> 'rejected' THEN
    IF EXISTS (
      SELECT 1
      FROM public.salary_requests sr
      WHERE sr.user_uuid = NEW.user_uuid
        AND sr.transfer_id = NEW.transfer_id
        AND sr.status <> 'rejected'
        AND (TG_OP = 'INSERT' OR sr.id <> NEW.id)
    ) THEN
      RAISE EXCEPTION 'TRANSFER_ALREADY_USED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_salary_requests_single_use ON public.salary_requests;
CREATE TRIGGER trg_salary_requests_single_use
BEFORE INSERT OR UPDATE ON public.salary_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_salary_transfer_single_use();
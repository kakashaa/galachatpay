
-- Completely rebuild RLS policies on salary_requests
-- First disable and re-enable RLS to force cache refresh
ALTER TABLE public.salary_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_requests ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Allow insert salary requests" ON public.salary_requests;
DROP POLICY IF EXISTS "Anyone can insert requests" ON public.salary_requests;
DROP POLICY IF EXISTS "Service role can update salary requests" ON public.salary_requests;
DROP POLICY IF EXISTS "Users can only read own salary requests" ON public.salary_requests;

-- Recreate all policies as PERMISSIVE
CREATE POLICY "salary_insert_policy"
ON public.salary_requests
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "salary_select_policy"
ON public.salary_requests
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (user_uuid = COALESCE(current_setting('app.current_user_uuid'::text, true), ''::text));

CREATE POLICY "salary_update_service"
ON public.salary_requests
AS PERMISSIVE
FOR UPDATE
TO service_role
USING (true);

-- Also grant service_role full SELECT for admin dashboard
CREATE POLICY "salary_select_service"
ON public.salary_requests
AS PERMISSIVE
FOR SELECT
TO service_role
USING (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

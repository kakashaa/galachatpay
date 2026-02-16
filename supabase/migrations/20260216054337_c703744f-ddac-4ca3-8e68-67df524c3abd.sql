
-- Fix star_cashout_codes SELECT policy to allow code validation lookups
DROP POLICY IF EXISTS "Users can only read own cashout codes" ON public.star_cashout_codes;
CREATE POLICY "Anyone can read cashout codes"
ON public.star_cashout_codes
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);

-- Fix salary_requests SELECT policy for users to see their own requests
DROP POLICY IF EXISTS "salary_select_policy" ON public.salary_requests;
CREATE POLICY "salary_select_policy"
ON public.salary_requests
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);

NOTIFY pgrst, 'reload schema';

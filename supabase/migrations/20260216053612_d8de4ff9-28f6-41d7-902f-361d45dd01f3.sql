
-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Anyone can insert requests" ON public.salary_requests;

-- Create PERMISSIVE INSERT policy for both anon and authenticated
CREATE POLICY "Allow insert salary requests"
ON public.salary_requests
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

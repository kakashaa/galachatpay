
-- Drop all existing INSERT policies on salary_requests
DROP POLICY IF EXISTS "Anyone can insert requests" ON public.salary_requests;

-- Create a PERMISSIVE INSERT policy
CREATE POLICY "Anyone can insert requests"
ON public.salary_requests
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

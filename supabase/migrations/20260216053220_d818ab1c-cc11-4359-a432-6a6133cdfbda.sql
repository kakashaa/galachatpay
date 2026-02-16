
-- Drop the restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can insert requests" ON public.salary_requests;

CREATE POLICY "Anyone can insert requests"
ON public.salary_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

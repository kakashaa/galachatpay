-- Drop restrictive SELECT policy and replace with public read
DROP POLICY IF EXISTS "Users can only read own support tickets" ON public.support_tickets;
CREATE POLICY "Anyone can read support tickets" ON public.support_tickets FOR SELECT TO public USING (true);

-- Also fix update policy to allow anon
DROP POLICY IF EXISTS "Service role can update tickets" ON public.support_tickets;
CREATE POLICY "Anyone can update tickets" ON public.support_tickets FOR UPDATE TO public USING (true);

-- Fix ticket_replies update policy
DROP POLICY IF EXISTS "Service role can update ticket replies" ON public.ticket_replies;
CREATE POLICY "Anyone can update ticket replies" ON public.ticket_replies FOR UPDATE TO public USING (true);
-- RLS policies with explicit text casting on both sides

-- salary_requests
DROP POLICY IF EXISTS "Users can read own requests" ON public.salary_requests;
CREATE POLICY "Users can only read own salary requests"
ON public.salary_requests
FOR SELECT
USING (user_uuid = (COALESCE(current_setting('app.current_user_uuid', true), '')::text));

-- support_tickets  
DROP POLICY IF EXISTS "Anyone can read tickets" ON public.support_tickets;
CREATE POLICY "Users can only read own support tickets"
ON public.support_tickets
FOR SELECT
USING (user_uuid = (COALESCE(current_setting('app.current_user_uuid', true), '')::text));

-- star_cashout_codes
DROP POLICY IF EXISTS "Users can read cashout codes" ON public.star_cashout_codes;
CREATE POLICY "Users can only read own cashout codes"
ON public.star_cashout_codes
FOR SELECT
USING (user_uuid = (COALESCE(current_setting('app.current_user_uuid', true), '')::text));

-- support_chat_sessions
DROP POLICY IF EXISTS "Anyone can read chat sessions" ON public.support_chat_sessions;
CREATE POLICY "Users can only read own chat sessions"
ON public.support_chat_sessions
FOR SELECT
USING (user_uuid = (COALESCE(current_setting('app.current_user_uuid', true), '')::text));

-- user_star_balance
DROP POLICY IF EXISTS "Users can read own star balance" ON public.user_star_balance;
CREATE POLICY "Users can only read own star balance"
ON public.user_star_balance
FOR SELECT
USING (user_uuid = (COALESCE(current_setting('app.current_user_uuid', true), '')::text));
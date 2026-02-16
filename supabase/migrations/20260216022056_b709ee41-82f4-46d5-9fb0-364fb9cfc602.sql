
-- Fix: Allow anyone to read star balance (app uses custom auth, not Supabase Auth)
DROP POLICY IF EXISTS "Users can only read own star balance" ON public.user_star_balance;
CREATE POLICY "Anyone can read star balance"
  ON public.user_star_balance
  FOR SELECT
  USING (true);

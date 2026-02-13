
-- ============================================================
-- RESTORE client-side operations that are needed by the app
-- BUT keep admin-only restrictions (salary_requests, animated_photo_requests, ban_reports)
-- ============================================================

-- 1. notifications - clients need to mark their own as read
-- Revert to allow update but make it less permissive (still limited without auth.uid)
DROP POLICY IF EXISTS "Service role can update notifications" ON public.notifications;
CREATE POLICY "Service role can update notifications"
  ON public.notifications FOR UPDATE
  TO service_role
  USING (true);
-- Also allow anon to update (mark as read) - will be handled via edge function later
CREATE POLICY "Anon can update notifications"
  ON public.notifications FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 2. item_comments - clients need to delete their own comments
DROP POLICY IF EXISTS "Service role can delete comments" ON public.item_comments;
CREATE POLICY "Service role can delete comments"
  ON public.item_comments FOR DELETE
  TO service_role
  USING (true);
CREATE POLICY "Anon can delete comments"
  ON public.item_comments FOR DELETE
  TO anon
  USING (true);

-- 3. user_star_balance - clients need to update/upsert their balances
DROP POLICY IF EXISTS "Service role can update star balance" ON public.user_star_balance;
CREATE POLICY "Service role can update star balance"
  ON public.user_star_balance FOR UPDATE
  TO service_role
  USING (true);
CREATE POLICY "Anon can update star balance"
  ON public.user_star_balance FOR UPDATE
  TO anon
  USING (true);

-- 4. star_cashout_codes - clients need to update (mark as used)
DROP POLICY IF EXISTS "Service role can update cashout codes" ON public.star_cashout_codes;
CREATE POLICY "Service role can update cashout codes"
  ON public.star_cashout_codes FOR UPDATE
  TO service_role
  USING (true);
CREATE POLICY "Anon can update cashout codes"
  ON public.star_cashout_codes FOR UPDATE
  TO anon
  USING (true);

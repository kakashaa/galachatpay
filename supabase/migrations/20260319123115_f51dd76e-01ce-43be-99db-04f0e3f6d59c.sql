-- Allow public to read limited columns from admin_accounts (for complaint page)
CREATE POLICY "Public can read admin accounts basic info"
ON public.admin_accounts
FOR SELECT
TO public
USING (is_active = true);
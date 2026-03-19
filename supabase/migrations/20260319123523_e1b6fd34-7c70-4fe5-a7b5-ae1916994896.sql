DROP POLICY IF EXISTS "Public can read admin accounts basic info" ON public.admin_accounts;

CREATE POLICY "Public can read admin accounts"
ON public.admin_accounts
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert admin accounts"
ON public.admin_accounts
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can update admin accounts"
ON public.admin_accounts
FOR UPDATE
TO public
USING (true);

CREATE POLICY "Public can delete admin accounts"
ON public.admin_accounts
FOR DELETE
TO public
USING (true);
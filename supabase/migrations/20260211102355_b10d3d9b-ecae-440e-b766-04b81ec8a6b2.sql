
-- Allow delete on video_tutorials (used by admin via service role)
CREATE POLICY "Service role can manage video tutorials"
ON public.video_tutorials FOR DELETE
USING (true);

-- Allow update on video_tutorials
CREATE POLICY "Service role can update video tutorials"
ON public.video_tutorials FOR UPDATE
USING (true);

-- Allow insert on video_tutorials
CREATE POLICY "Service role can insert video tutorials"
ON public.video_tutorials FOR INSERT
WITH CHECK (true);

-- Allow delete on ban_reports for admin management
CREATE POLICY "Allow updates on ban reports"
ON public.ban_reports FOR UPDATE
USING (true);

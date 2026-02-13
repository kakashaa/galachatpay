-- Restrict storage: remove public upload/delete, keep read-only public access

-- Videos bucket: remove anyone-can-upload and anyone-can-delete
DROP POLICY IF EXISTS "Anyone can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete videos" ON storage.objects;

-- Attachments bucket: remove anyone-can-upload  
DROP POLICY IF EXISTS "Anyone can upload attachments" ON storage.objects;

-- Add service-role-only upload policies (edge functions use service role)
CREATE POLICY "Service role can upload to videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos' AND (SELECT current_setting('role') = 'service_role'));

CREATE POLICY "Service role can delete from videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos' AND (SELECT current_setting('role') = 'service_role'));

CREATE POLICY "Service role can upload to attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attachments' AND (SELECT current_setting('role') = 'service_role'));

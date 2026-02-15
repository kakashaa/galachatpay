
CREATE POLICY "Anyone can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Anyone can read attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'attachments');

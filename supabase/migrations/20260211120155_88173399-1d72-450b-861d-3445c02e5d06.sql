
-- Create storage bucket for video tutorials
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('videos', 'videos', true, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
CREATE POLICY "Anyone can read videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- Allow authenticated/service uploads (admin uses service role via edge function, but let's allow anon too for simplicity)
CREATE POLICY "Anyone can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Anyone can delete videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos');

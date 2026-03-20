
-- BD Notifications table
CREATE TABLE IF NOT EXISTS public.bd_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_uuid text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text DEFAULT 'admin_message',
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  sent_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bd_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bd_notifications" ON public.bd_notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bd_notifications" ON public.bd_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bd_notifications" ON public.bd_notifications FOR UPDATE USING (true);

-- Add media columns to admin_chat_messages
ALTER TABLE public.admin_chat_messages
  ADD COLUMN IF NOT EXISTS media_url text;

-- Add media columns to support_chat_messages
ALTER TABLE public.support_chat_messages
  ADD COLUMN IF NOT EXISTS media_url text;

-- Create chat-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-media', 'chat-media', true, 8388608, ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Storage policy for chat-media
CREATE POLICY "Anyone can upload to chat-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media');
CREATE POLICY "Anyone can read chat-media" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');


-- Admin group chat messages table
CREATE TABLE public.admin_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_username TEXT NOT NULL,
  sender_display_name TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

-- Public read/write (admin auth is handled at app level via session tokens)
CREATE POLICY "Allow all operations on admin_chat_messages"
  ON public.admin_chat_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_chat_messages;

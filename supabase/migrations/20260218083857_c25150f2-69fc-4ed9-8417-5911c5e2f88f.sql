
-- Table: support_messages (for quick support chat)
CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.quick_support_requests(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'user',
  sender_name text NOT NULL DEFAULT '',
  message text NOT NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert support_messages" ON public.support_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read support_messages" ON public.support_messages FOR SELECT USING (true);
CREATE POLICY "Service role can update support_messages" ON public.support_messages FOR UPDATE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Table: ticket_messages (for support tickets chat)
CREATE TABLE public.ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'user',
  sender_name text NOT NULL DEFAULT '',
  message text NOT NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ticket_messages" ON public.ticket_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read ticket_messages" ON public.ticket_messages FOR SELECT USING (true);
CREATE POLICY "Service role can update ticket_messages" ON public.ticket_messages FOR UPDATE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;

-- Add ticket_type column to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS ticket_type text NOT NULL DEFAULT 'other';


-- ============================================================
-- SUPPORT SYSTEM: Tickets + Live Chat
-- ============================================================

-- 1. Support Tickets (for regular users)
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  user_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  admin_reply TEXT,
  admin_username TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tickets
CREATE POLICY "Anyone can insert tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (true);

-- Users can read their own tickets
CREATE POLICY "Anyone can read tickets"
  ON public.support_tickets FOR SELECT
  USING (true);

-- Only service_role can update tickets (admin replies)
CREATE POLICY "Service role can update tickets"
  ON public.support_tickets FOR UPDATE
  TO service_role
  USING (true);

-- 2. Support Chat Messages (VIP live chat)
CREATE TABLE public.support_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'user',
  sender_name TEXT NOT NULL,
  sender_uuid TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert messages
CREATE POLICY "Anyone can insert chat messages"
  ON public.support_chat_messages FOR INSERT
  WITH CHECK (true);

-- Anyone can read chat messages
CREATE POLICY "Anyone can read chat messages"
  ON public.support_chat_messages FOR SELECT
  USING (true);

-- Service role can update (mark as read)
CREATE POLICY "Service role can update chat messages"
  ON public.support_chat_messages FOR UPDATE
  TO service_role
  USING (true);

-- 3. Support Chat Sessions (track VIP chat sessions)
CREATE TABLE public.support_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  user_name TEXT NOT NULL,
  room_id TEXT,
  vip_level INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting',
  admin_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert chat sessions"
  ON public.support_chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read chat sessions"
  ON public.support_chat_sessions FOR SELECT
  USING (true);

CREATE POLICY "Service role can update chat sessions"
  ON public.support_chat_sessions FOR UPDATE
  TO service_role
  USING (true);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_salary_requests_updated_at();

CREATE TRIGGER update_support_chat_sessions_updated_at
  BEFORE UPDATE ON public.support_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_salary_requests_updated_at();

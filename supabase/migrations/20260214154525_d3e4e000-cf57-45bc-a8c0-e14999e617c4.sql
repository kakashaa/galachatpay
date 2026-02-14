
-- Create ticket_replies table for conversation threads
CREATE TABLE public.ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'user', -- 'user' or 'admin'
  sender_name TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Anyone can insert replies (users reply to their tickets, admins reply via service role)
CREATE POLICY "Anyone can insert ticket replies"
ON public.ticket_replies
FOR INSERT
WITH CHECK (true);

-- Anyone can read ticket replies (filtered by ticket ownership in app logic)
CREATE POLICY "Anyone can read ticket replies"
ON public.ticket_replies
FOR SELECT
USING (true);

-- Service role can update (mark as read)
CREATE POLICY "Service role can update ticket replies"
ON public.ticket_replies
FOR UPDATE
USING (true);

-- Enable realtime for ticket_replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_replies;

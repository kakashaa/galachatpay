CREATE TABLE public.admin_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  chat_room_id text NOT NULL,
  started_by text NOT NULL,
  started_by_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  participants text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.admin_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin_calls" ON public.admin_calls FOR SELECT USING (true);
CREATE POLICY "Anyone can insert admin_calls" ON public.admin_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update admin_calls" ON public.admin_calls FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_calls;
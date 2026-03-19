-- 1. Admin shifts table
CREATE TABLE public.admin_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_username text NOT NULL,
  admin_display_name text NOT NULL DEFAULT '',
  role_type text NOT NULL DEFAULT 'admin',
  shift_start time NOT NULL,
  shift_end time NOT NULL,
  phone_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read admin_shifts" ON public.admin_shifts FOR SELECT TO public USING (true);
CREATE POLICY "Service role can manage admin_shifts" ON public.admin_shifts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Support sessions table
CREATE TABLE public.support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  support_level integer NOT NULL DEFAULT 1,
  request_type text,
  assigned_admin text,
  assigned_admin_name text,
  status text NOT NULL DEFAULT 'waiting',
  escalation_level integer NOT NULL DEFAULT 0,
  room_name text,
  file_url text,
  file_type text,
  notes text,
  admin_note text,
  last_message_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read support_sessions" ON public.support_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert support_sessions" ON public.support_sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update support_sessions" ON public.support_sessions FOR UPDATE TO public USING (true);

-- 3. Support session messages
CREATE TABLE public.support_session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.support_sessions(id) ON DELETE CASCADE,
  sender_uuid text NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  sender_type text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  attachment_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_session_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read support_session_messages" ON public.support_session_messages FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert support_session_messages" ON public.support_session_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update support_session_messages" ON public.support_session_messages FOR UPDATE TO public USING (true);

-- 4. Support ratings
CREATE TABLE public.support_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.support_sessions(id),
  ticket_id text,
  user_uuid text NOT NULL,
  admin_username text NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read support_ratings" ON public.support_ratings FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert support_ratings" ON public.support_ratings FOR INSERT TO public WITH CHECK (true);

-- 5. Support session participants
CREATE TABLE public.support_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.support_sessions(id) ON DELETE CASCADE,
  admin_username text NOT NULL,
  admin_display_name text NOT NULL DEFAULT '',
  role_type text NOT NULL DEFAULT 'admin',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, admin_username)
);

ALTER TABLE public.support_session_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read participants" ON public.support_session_participants FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert participants" ON public.support_session_participants FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete participants" ON public.support_session_participants FOR DELETE TO public USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_session_messages;
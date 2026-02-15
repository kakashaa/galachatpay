
-- BD Events table
CREATE TABLE public.bd_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bd_uuid TEXT NOT NULL,
  bd_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- BD Event registrations
CREATE TABLE public.bd_event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.bd_events(id) ON DELETE CASCADE,
  bd_uuid TEXT NOT NULL,
  user_uuid TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  user_type INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_uuid)
);

-- Enable RLS
ALTER TABLE public.bd_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bd_event_registrations ENABLE ROW LEVEL SECURITY;

-- Public read for active events
CREATE POLICY "Anyone can view active events"
  ON public.bd_events FOR SELECT
  USING (is_active = true);

-- BD can manage their own events
CREATE POLICY "BD can insert own events"
  ON public.bd_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "BD can update own events"
  ON public.bd_events FOR UPDATE
  USING (true);

-- Public can register for events
CREATE POLICY "Anyone can register for events"
  ON public.bd_event_registrations FOR INSERT
  WITH CHECK (true);

-- Anyone can view registrations
CREATE POLICY "Anyone can view registrations"
  ON public.bd_event_registrations FOR SELECT
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bd_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bd_event_registrations;

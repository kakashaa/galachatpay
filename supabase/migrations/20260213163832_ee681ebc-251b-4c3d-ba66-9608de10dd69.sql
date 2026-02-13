-- Create bd_requests_cache table to mirror external BD requests for realtime
CREATE TABLE public.bd_requests_cache (
  id text NOT NULL PRIMARY KEY,
  user_uuid text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  request_type text NOT NULL DEFAULT 'bd_verify',
  status integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bd_requests_cache ENABLE ROW LEVEL SECURITY;

-- Policies: read-only for anon, full access for service role
CREATE POLICY "Anyone can read bd_requests_cache"
  ON public.bd_requests_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert bd_requests_cache"
  ON public.bd_requests_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update bd_requests_cache"
  ON public.bd_requests_cache FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete bd_requests_cache"
  ON public.bd_requests_cache FOR DELETE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bd_requests_cache;
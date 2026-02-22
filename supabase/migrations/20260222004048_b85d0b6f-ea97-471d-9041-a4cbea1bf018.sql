
-- Cache table for BD API responses (5 minute TTL)
CREATE TABLE IF NOT EXISTS public.edge_function_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS needed - only accessed from edge functions via service role
ALTER TABLE public.edge_function_cache ENABLE ROW LEVEL SECURITY;

-- Index for cleanup
CREATE INDEX idx_edge_function_cache_expires ON public.edge_function_cache (expires_at);


-- Table to track BD violations when inviting ineligible members
CREATE TABLE public.bd_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bd_uuid TEXT NOT NULL,
  bd_name TEXT NOT NULL DEFAULT '',
  violation_type TEXT NOT NULL DEFAULT 'ineligible_invite',
  member_uuid TEXT NOT NULL,
  member_name TEXT NOT NULL DEFAULT '',
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bd_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bd_violations" ON public.bd_violations FOR SELECT USING (true);
CREATE POLICY "Service role can insert bd_violations" ON public.bd_violations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can delete bd_violations" ON public.bd_violations FOR DELETE USING (true);

-- Index for quick lookup by bd_uuid
CREATE INDEX idx_bd_violations_bd_uuid ON public.bd_violations (bd_uuid);

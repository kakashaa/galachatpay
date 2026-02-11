
CREATE TABLE public.id_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid text NOT NULL,
  new_id text NOT NULL,
  level_milestone integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.id_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read id_changes" ON public.id_changes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert id_changes" ON public.id_changes FOR INSERT WITH CHECK (true);

CREATE INDEX idx_id_changes_user_uuid ON public.id_changes (user_uuid);

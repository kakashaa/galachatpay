
CREATE TABLE IF NOT EXISTS public.admin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  username text NOT NULL,
  content_type text NOT NULL,
  media_url text,
  thumbnail_url text,
  caption text,
  likes_count int DEFAULT 0,
  views_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_posts_read" ON public.admin_posts FOR SELECT USING (true);
CREATE POLICY "admin_posts_insert" ON public.admin_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_posts_update" ON public.admin_posts FOR UPDATE USING (true);
CREATE POLICY "admin_posts_delete" ON public.admin_posts FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.admin_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  username text NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL,
  duration int DEFAULT 20,
  views jsonb DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_stories_read" ON public.admin_stories FOR SELECT USING (true);
CREATE POLICY "admin_stories_insert" ON public.admin_stories FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_stories_update" ON public.admin_stories FOR UPDATE USING (true);
CREATE POLICY "admin_stories_delete" ON public.admin_stories FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_stories;

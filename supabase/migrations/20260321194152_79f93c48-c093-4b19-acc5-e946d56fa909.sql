
-- Comments on admin posts
CREATE TABLE IF NOT EXISTS public.admin_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.admin_posts(id) ON DELETE CASCADE NOT NULL,
  commenter_name text NOT NULL DEFAULT '',
  commenter_uuid text,
  is_admin boolean DEFAULT false,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Likes on admin posts
CREATE TABLE IF NOT EXISTS public.admin_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.admin_posts(id) ON DELETE CASCADE NOT NULL,
  liker_uuid text NOT NULL,
  liker_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, liker_uuid)
);

-- Enable RLS
ALTER TABLE public.admin_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_post_likes ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (admin app uses admin_key, not auth)
CREATE POLICY "Allow all access to admin_post_comments" ON public.admin_post_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to admin_post_likes" ON public.admin_post_likes FOR ALL USING (true) WITH CHECK (true);

-- Add unique constraint to admin_ratings if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_ratings_admin_username_user_uuid_key'
  ) THEN
    ALTER TABLE public.admin_ratings ADD CONSTRAINT admin_ratings_admin_username_user_uuid_key UNIQUE (admin_username, user_uuid);
  END IF;
END $$;

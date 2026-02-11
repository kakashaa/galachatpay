
-- Comments table (polymorphic: works for entries, frames, custom gifts)
CREATE TABLE public.item_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT NOT NULL, -- 'entry_gift', 'frame', 'custom_gift'
  item_id UUID NOT NULL,
  user_uuid TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_image TEXT,
  parent_id UUID REFERENCES public.item_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Likes table
CREATE TABLE public.item_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  user_uuid TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_type, item_id, user_uuid)
);

-- Enable RLS
ALTER TABLE public.item_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_likes ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Anyone can read comments" ON public.item_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON public.item_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete own comments" ON public.item_comments FOR DELETE USING (true);

-- Likes policies
CREATE POLICY "Anyone can read likes" ON public.item_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert likes" ON public.item_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete likes" ON public.item_likes FOR DELETE USING (true);

-- Indexes
CREATE INDEX idx_comments_item ON public.item_comments(item_type, item_id);
CREATE INDEX idx_comments_parent ON public.item_comments(parent_id);
CREATE INDEX idx_likes_item ON public.item_likes(item_type, item_id);
CREATE INDEX idx_likes_user ON public.item_likes(user_uuid, item_type, item_id);

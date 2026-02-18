
-- Add star_cost to hairs table
ALTER TABLE public.hairs ADD COLUMN IF NOT EXISTS star_cost integer NOT NULL DEFAULT 10;

-- Add status to hair_selections for approval flow
ALTER TABLE public.hair_selections ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.hair_selections ADD COLUMN IF NOT EXISTS admin_note text;

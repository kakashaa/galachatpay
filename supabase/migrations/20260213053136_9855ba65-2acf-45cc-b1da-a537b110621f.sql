
-- Add soft-delete columns to tables that support deletion
ALTER TABLE public.video_tutorials ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.video_tutorials ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.entry_gifts ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.entry_gifts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.frames ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.frames ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.custom_gifts ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.custom_gifts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

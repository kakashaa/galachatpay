
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add default sync schedule setting
INSERT INTO public.app_settings (key, value)
VALUES ('bd_sync_schedule', 'daily')
ON CONFLICT (key) DO NOTHING;

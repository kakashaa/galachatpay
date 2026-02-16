
-- Create a simple app settings table
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT 'true',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read app_settings"
ON public.app_settings FOR SELECT
USING (true);

-- Service role can manage settings
CREATE POLICY "Service role can update app_settings"
ON public.app_settings FOR UPDATE
USING (true);

CREATE POLICY "Service role can insert app_settings"
ON public.app_settings FOR INSERT
WITH CHECK (true);

-- Insert default setting
INSERT INTO public.app_settings (key, value) VALUES ('bd_monthly_withdraw_enabled', 'true');

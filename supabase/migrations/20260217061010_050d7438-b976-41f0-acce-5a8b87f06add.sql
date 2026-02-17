
-- Create user_devices table to track which device each user uses
CREATE TABLE public.user_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid text NOT NULL,
  device_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint: one user per device mapping
CREATE UNIQUE INDEX idx_user_devices_user_uuid ON public.user_devices (user_uuid);

-- Index for device lookups
CREATE INDEX idx_user_devices_device_id ON public.user_devices (device_id);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read user_devices" ON public.user_devices FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_devices" ON public.user_devices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user_devices" ON public.user_devices FOR UPDATE USING (true);

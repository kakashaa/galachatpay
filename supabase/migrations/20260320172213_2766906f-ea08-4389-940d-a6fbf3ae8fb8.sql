
-- المستويات
CREATE TABLE IF NOT EXISTS public.supporter_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_coins bigint NOT NULL,
  color text DEFAULT '#cd7f32',
  sort_order integer DEFAULT 0,
  rewards jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.supporter_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read supporter_tiers" ON public.supporter_tiers FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert supporter_tiers" ON public.supporter_tiers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update supporter_tiers" ON public.supporter_tiers FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete supporter_tiers" ON public.supporter_tiers FOR DELETE TO public USING (true);

-- مكافآت المستخدمين
CREATE TABLE IF NOT EXISTS public.supporter_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid text NOT NULL,
  tier_id uuid REFERENCES public.supporter_tiers(id),
  tier_name text,
  month text NOT NULL,
  type text NOT NULL,
  value integer,
  ware_id integer,
  duration_days integer,
  count integer DEFAULT 1,
  status text DEFAULT 'available',
  used_at timestamptz,
  used_for text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.supporter_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read supporter_rewards" ON public.supporter_rewards FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert supporter_rewards" ON public.supporter_rewards FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update supporter_rewards" ON public.supporter_rewards FOR UPDATE TO public USING (true);

-- سجل الشحن الشهري
CREATE TABLE IF NOT EXISTS public.supporter_monthly_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid text NOT NULL,
  month text NOT NULL,
  total_coins bigint DEFAULT 0,
  tier_name text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(uuid, month)
);

ALTER TABLE public.supporter_monthly_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read supporter_monthly_charges" ON public.supporter_monthly_charges FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert supporter_monthly_charges" ON public.supporter_monthly_charges FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update supporter_monthly_charges" ON public.supporter_monthly_charges FOR UPDATE TO public USING (true);

-- إعدادات النظام
CREATE TABLE IF NOT EXISTS public.supporter_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean DEFAULT true,
  reward_validity_days integer DEFAULT 30,
  distribution_mode text DEFAULT 'auto',
  notify_user boolean DEFAULT true,
  notify_admin boolean DEFAULT true,
  reminder_days integer DEFAULT 3,
  special_offers jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.supporter_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read supporter_settings" ON public.supporter_settings FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert supporter_settings" ON public.supporter_settings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update supporter_settings" ON public.supporter_settings FOR UPDATE TO public USING (true);

-- Insert default tiers
INSERT INTO public.supporter_tiers (name, min_coins, color, sort_order, rewards) VALUES
('برونزي', 1000000, '#cd7f32', 1, '[{"type":"vip","value":3,"duration_days":3},{"type":"frame","ware_id":45,"duration_days":3}]'),
('فضي', 5000000, '#c0c0c0', 2, '[{"type":"vip","value":5,"duration_days":7},{"type":"frame","ware_id":45,"duration_days":7},{"type":"entry","ware_id":12,"duration_days":7}]'),
('ذهبي', 15000000, '#ffd700', 3, '[{"type":"vip","value":6,"duration_days":15},{"type":"frame","ware_id":45,"duration_days":7},{"type":"entry","ware_id":12,"duration_days":7},{"type":"necklace","ware_id":88,"duration_days":7},{"type":"uuid_change","count":1}]'),
('ماسي', 30000000, '#00bfff', 4, '[{"type":"vip","value":6,"duration_days":30},{"type":"frame","ware_id":45,"duration_days":15},{"type":"entry","ware_id":12,"duration_days":15},{"type":"necklace","ware_id":88,"duration_days":15},{"type":"custom_gift","ware_id":0,"duration_days":30},{"type":"coins","value":50000},{"type":"uuid_change","count":2}]'),
('أسطوري', 50000000, '#9b59b6', 5, '[{"type":"vip","value":6,"duration_days":30},{"type":"frame","ware_id":45,"duration_days":30},{"type":"entry","ware_id":12,"duration_days":30},{"type":"necklace","ware_id":88,"duration_days":30},{"type":"animated_photo","ware_id":0,"duration_days":30},{"type":"coins","value":100000},{"type":"uuid_change","count":3},{"type":"badge","ware_id":0,"duration_days":30}]');

-- Insert default settings
INSERT INTO public.supporter_settings (is_active, reward_validity_days, distribution_mode) VALUES (true, 30, 'auto');

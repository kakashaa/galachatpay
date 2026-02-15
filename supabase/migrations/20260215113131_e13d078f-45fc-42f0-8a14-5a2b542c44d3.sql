
-- جدول أعضاء البيدي (المسجلين عبر رابط الدعوة)
CREATE TABLE public.bd_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bd_uuid TEXT NOT NULL,
  member_uuid TEXT NOT NULL,
  member_name TEXT NOT NULL DEFAULT '',
  member_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'host', 'agency'
  type_user INTEGER NOT NULL DEFAULT 0,
  monthly_charges NUMERIC NOT NULL DEFAULT 0,
  total_commission NUMERIC NOT NULL DEFAULT 0,
  current_month_commission NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bd_uuid, member_uuid)
);

ALTER TABLE public.bd_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bd_members" ON public.bd_members FOR SELECT USING (true);
CREATE POLICY "Service role can insert bd_members" ON public.bd_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update bd_members" ON public.bd_members FOR UPDATE USING (true);
CREATE POLICY "Service role can delete bd_members" ON public.bd_members FOR DELETE USING (true);

-- جدول إعدادات النسب لكل BD
CREATE TABLE public.bd_commission_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bd_uuid TEXT NOT NULL UNIQUE,
  bd_name TEXT NOT NULL DEFAULT '',
  agency_commission_pct NUMERIC NOT NULL DEFAULT 5,
  host_commission_pct NUMERIC NOT NULL DEFAULT 3,
  user_commission_pct NUMERIC NOT NULL DEFAULT 2,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  referral_code TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bd_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bd_commission_settings" ON public.bd_commission_settings FOR SELECT USING (true);
CREATE POLICY "Service role can insert bd_commission_settings" ON public.bd_commission_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update bd_commission_settings" ON public.bd_commission_settings FOR UPDATE USING (true);

-- جدول سجل العمولات الشهرية
CREATE TABLE public.bd_commission_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bd_uuid TEXT NOT NULL,
  member_uuid TEXT NOT NULL,
  member_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  source_amount NUMERIC NOT NULL DEFAULT 0,
  commission_pct NUMERIC NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bd_commission_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bd_commission_logs" ON public.bd_commission_logs FOR SELECT USING (true);
CREATE POLICY "Service role can insert bd_commission_logs" ON public.bd_commission_logs FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bd_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bd_commission_settings;

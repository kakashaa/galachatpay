CREATE TABLE public.chargeback_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  amount_usd numeric NOT NULL DEFAULT 0,
  platform text NOT NULL DEFAULT 'google_play',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chargeback_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chargeback_alerts" ON public.chargeback_alerts FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert chargeback_alerts" ON public.chargeback_alerts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update chargeback_alerts" ON public.chargeback_alerts FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete chargeback_alerts" ON public.chargeback_alerts FOR DELETE TO public USING (true);
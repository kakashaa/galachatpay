
CREATE TABLE IF NOT EXISTS public.works_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  works_code text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  balance_usd numeric NOT NULL DEFAULT 0,
  total_earnings_usd numeric NOT NULL DEFAULT 0,
  supporter_commission_pct numeric NOT NULL DEFAULT 2,
  agent_commission_pct numeric NOT NULL DEFAULT 3,
  supporter_count integer NOT NULL DEFAULT 0,
  agent_count integer NOT NULL DEFAULT 0,
  can_withdraw boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.works_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'works_accounts' AND policyname = 'works_accounts_all') THEN
    CREATE POLICY "works_accounts_all" ON public.works_accounts FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.works_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  works_id uuid REFERENCES public.works_accounts(id) ON DELETE CASCADE,
  user_uuid text NOT NULL,
  amount_usd numeric NOT NULL DEFAULT 0,
  amount_coins integer NOT NULL DEFAULT 0,
  recipient_uuid text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.works_withdrawals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'works_withdrawals' AND policyname = 'works_withdrawals_all') THEN
    CREATE POLICY "works_withdrawals_all" ON public.works_withdrawals FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

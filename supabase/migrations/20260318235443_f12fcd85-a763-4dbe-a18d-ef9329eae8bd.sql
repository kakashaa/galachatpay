-- Works accounts
CREATE TABLE IF NOT EXISTS works_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid text UNIQUE NOT NULL,
  user_name text DEFAULT '',
  works_code text UNIQUE NOT NULL,
  status text DEFAULT 'pending',
  balance_usd numeric(10,2) DEFAULT 0,
  total_earnings_usd numeric(10,2) DEFAULT 0,
  supporter_commission_pct numeric(5,2) DEFAULT 2.0,
  agent_commission_pct numeric(5,2) DEFAULT 3.0,
  can_withdraw boolean DEFAULT true,
  auto_approve_withdrawals boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Works members
CREATE TABLE IF NOT EXISTS works_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  works_id uuid REFERENCES works_accounts(id) ON DELETE CASCADE,
  member_uuid text NOT NULL,
  member_name text DEFAULT '',
  member_type text NOT NULL CHECK (member_type IN ('supporter', 'agent')),
  status text DEFAULT 'pending',
  commission_pct numeric(5,2),
  total_commission_usd numeric(10,2) DEFAULT 0,
  joined_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(works_id, member_uuid)
);

-- Works earnings
CREATE TABLE IF NOT EXISTS works_earnings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  works_id uuid REFERENCES works_accounts(id) ON DELETE CASCADE,
  member_id uuid REFERENCES works_members(id) ON DELETE CASCADE,
  member_uuid text NOT NULL,
  period_date date NOT NULL,
  member_activity_usd numeric(10,2) DEFAULT 0,
  commission_pct numeric(5,2) NOT NULL,
  commission_usd numeric(10,2) NOT NULL,
  source text,
  created_at timestamptz DEFAULT now()
);

-- Works withdrawals
CREATE TABLE IF NOT EXISTS works_withdrawals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  works_id uuid REFERENCES works_accounts(id) ON DELETE CASCADE,
  user_uuid text NOT NULL,
  amount_usd numeric(10,2) NOT NULL,
  amount_coins bigint NOT NULL,
  recipient_uuid text NOT NULL,
  status text DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now()
);

-- Works requests
CREATE TABLE IF NOT EXISTS works_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid text NOT NULL,
  user_name text DEFAULT '',
  user_level integer DEFAULT 0,
  status text DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE works_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "works_accounts_all" ON works_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "works_members_all" ON works_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "works_earnings_all" ON works_earnings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "works_withdrawals_all" ON works_withdrawals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "works_requests_all" ON works_requests FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_works_members_works_id ON works_members(works_id);
CREATE INDEX idx_works_earnings_works_id ON works_earnings(works_id);
CREATE INDEX idx_works_earnings_date ON works_earnings(period_date);
CREATE INDEX idx_works_members_uuid ON works_members(member_uuid);
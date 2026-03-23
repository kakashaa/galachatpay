
CREATE TABLE IF NOT EXISTS works_commission_logs (
  id uuid primary key default gen_random_uuid(),
  works_id text,
  bd_uuid text not null,
  member_uuid text,
  member_type text,
  month text,
  source_amount numeric default 0,
  commission_pct numeric default 0,
  amount numeric default 0,
  description text,
  created_at timestamptz default now()
);
ALTER TABLE works_commission_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "works_commission_logs_all" ON works_commission_logs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS works_invitations (
  id uuid primary key default gen_random_uuid(),
  works_id text,
  inviter_uuid text,
  inviter_name text default '',
  inviter_code text default '',
  target_uuid text,
  target_name text default '',
  member_type text default 'supporter',
  status text default 'pending',
  terms_accepted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
ALTER TABLE works_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "works_invitations_all" ON works_invitations FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS works_notifications (
  id uuid primary key default gen_random_uuid(),
  works_id text,
  target_uuid text,
  title text,
  body text,
  type text,
  is_read boolean default false,
  is_dismissed boolean default false,
  sent_by text,
  created_at timestamptz default now()
);
ALTER TABLE works_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "works_notifications_all" ON works_notifications FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE works_commission_logs;

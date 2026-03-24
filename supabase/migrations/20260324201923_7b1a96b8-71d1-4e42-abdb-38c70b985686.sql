-- Create ticket_audit_log table with uuid reference
CREATE TABLE IF NOT EXISTS ticket_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES support_tickets(id),
  action text NOT NULL,
  performed_by text,
  performed_by_name text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ticket_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on ticket_audit_log" ON ticket_audit_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert on ticket_audit_log" ON ticket_audit_log FOR INSERT WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_audit_log;
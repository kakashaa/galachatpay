
-- BD Withdrawals table
CREATE TABLE public.bd_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bd_uuid text NOT NULL,
  bd_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  -- recipient info (filled after approval)
  recipient_name text,
  recipient_phone text,
  transfer_type text,
  country text,
  -- admin completion info
  admin_note text,
  transfer_number text,
  receipt_url text,
  approved_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bd_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bd_withdrawals" ON public.bd_withdrawals FOR SELECT USING (true);
CREATE POLICY "Service role can insert bd_withdrawals" ON public.bd_withdrawals FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update bd_withdrawals" ON public.bd_withdrawals FOR UPDATE USING (true);
CREATE POLICY "Service role can delete bd_withdrawals" ON public.bd_withdrawals FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bd_withdrawals;

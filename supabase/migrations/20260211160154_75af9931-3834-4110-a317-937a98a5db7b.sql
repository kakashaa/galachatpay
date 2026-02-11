
CREATE TABLE public.star_gift_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_uuid text NOT NULL,
  sender_name text NOT NULL,
  recipient_uuid text NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.star_gift_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert gift logs"
  ON public.star_gift_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read gift logs"
  ON public.star_gift_logs FOR SELECT
  USING (true);

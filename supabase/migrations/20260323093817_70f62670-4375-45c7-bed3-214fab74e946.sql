
-- Challenges table
CREATE TABLE public.supporter_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  target_amount bigint NOT NULL DEFAULT 0,
  reward_type text NOT NULL DEFAULT 'coins',
  reward_value numeric NOT NULL DEFAULT 0,
  reward_description text,
  duration_days integer NOT NULL DEFAULT 7,
  is_active boolean NOT NULL DEFAULT true,
  challenge_type text NOT NULL DEFAULT 'single',
  color text DEFAULT '#8b5cf6',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supporter_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active challenges" ON public.supporter_challenges
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert challenges" ON public.supporter_challenges
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update challenges" ON public.supporter_challenges
  FOR UPDATE TO public USING (true);

CREATE POLICY "Anyone can delete challenges" ON public.supporter_challenges
  FOR DELETE TO public USING (true);

-- Challenge progress table
CREATE TABLE public.supporter_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.supporter_challenges(id) ON DELETE CASCADE,
  current_amount bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_uuid, challenge_id)
);

ALTER TABLE public.supporter_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read challenge progress" ON public.supporter_challenge_progress
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert challenge progress" ON public.supporter_challenge_progress
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update challenge progress" ON public.supporter_challenge_progress
  FOR UPDATE TO public USING (true);

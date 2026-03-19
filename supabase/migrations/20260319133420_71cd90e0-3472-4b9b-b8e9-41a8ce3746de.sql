CREATE TABLE public.admin_host_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid text NOT NULL,
  request_type text NOT NULL DEFAULT 'other',
  notes text,
  image_url text,
  submitted_by text NOT NULL DEFAULT '',
  submitted_by_name text NOT NULL DEFAULT '',
  assigned_to text,
  assigned_to_name text,
  status text NOT NULL DEFAULT 'pending',
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_host_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin_host_requests" ON public.admin_host_requests FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert admin_host_requests" ON public.admin_host_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update admin_host_requests" ON public.admin_host_requests FOR UPDATE TO public USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_host_requests;
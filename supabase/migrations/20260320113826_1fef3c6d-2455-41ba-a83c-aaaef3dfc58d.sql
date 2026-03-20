
create table public.monitor_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  sender_uuid text,
  receiver_uuid text,
  amount numeric default 0,
  details jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.monitor_alerts enable row level security;

create policy "Anyone can read monitor_alerts"
  on public.monitor_alerts for select
  to public
  using (true);

create policy "Anyone can insert monitor_alerts"
  on public.monitor_alerts for insert
  to public
  with check (true);

create policy "Anyone can update monitor_alerts"
  on public.monitor_alerts for update
  to public
  using (true);

create policy "Anyone can delete monitor_alerts"
  on public.monitor_alerts for delete
  to public
  using (true);

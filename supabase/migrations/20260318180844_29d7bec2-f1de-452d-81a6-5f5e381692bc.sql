
create table public.admin_complaints (
  id uuid default gen_random_uuid() primary key,
  reporter_uuid text not null,
  reporter_name text,
  admin_username text not null,
  admin_name text,
  reason text not null,
  voice_url text,
  media_url text,
  media_type text,
  status text default 'pending',
  owner_notes text,
  created_at timestamptz default now()
);

alter table public.admin_complaints enable row level security;

create policy "Anyone can insert complaints"
on public.admin_complaints for insert
with check (true);

create policy "Anyone can read complaints"
on public.admin_complaints for select
using (true);

create policy "Anyone can update complaints"
on public.admin_complaints for update
using (true);

create table public.admin_ratings (
  id uuid default gen_random_uuid() primary key,
  user_uuid text not null,
  user_name text,
  admin_username text not null,
  admin_name text,
  rating integer not null,
  comment text,
  service_type text,
  created_at timestamptz default now()
);

alter table public.admin_ratings enable row level security;

create policy "Anyone can insert ratings"
on public.admin_ratings for insert
with check (true);

create policy "Anyone can read ratings"
on public.admin_ratings for select
using (true);

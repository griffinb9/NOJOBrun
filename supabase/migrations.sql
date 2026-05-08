-- ============================================================
-- NOJOB — Supabase schema
-- Run this in Supabase dashboard → SQL editor (run once)
-- ============================================================

-- user_profiles: one row per authenticated user
create table if not exists public.user_profiles (
  id              uuid references auth.users on delete cascade primary key,
  full_name       text not null default '',
  email           text not null default '',
  resume_text     text,
  resume_updated_at timestamptz,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

-- applications (job tracker)
create table if not exists public.applications (
  id              text primary key,
  user_id         uuid references auth.users on delete cascade not null,
  company         text not null default '',
  role            text not null default '',
  location        text,
  salary          text,
  status          text not null default 'applied',
  date_applied    date,
  interview_dates text[]      default '{}',
  job_url         text,
  job_description text,
  notes           text,
  contact_name    text,
  contact_email   text,
  sort_order      integer,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);
create index if not exists applications_user_id_idx on public.applications(user_id);

-- stories (story bank)
create table if not exists public.stories (
  id          text primary key,
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null default '',
  situation   text default '',
  task        text default '',
  action      text default '',
  result      text default '',
  tags        text[] default '{}',
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);
create index if not exists stories_user_id_idx on public.stories(user_id);

-- point_events (gamification log)
create table if not exists public.point_events (
  id              text primary key,
  user_id         uuid references auth.users on delete cascade not null,
  application_id  text,
  event_type      text not null,
  points          integer not null,
  description     text default '',
  created_at      timestamptz default now() not null
);
create index if not exists point_events_user_id_idx on public.point_events(user_id);

-- user_progress (rank / points totals)
create table if not exists public.user_progress (
  user_id            uuid references auth.users on delete cascade primary key,
  total_points       integer      default 0    not null,
  current_rank       text         default 'Underdog' not null,
  weekly_points      integer      default 0    not null,
  weekly_goal        integer      default 50   not null,
  week_start_date    timestamptz  default now() not null,
  last_activity_date timestamptz  default now() not null,
  created_at         timestamptz  default now() not null,
  updated_at         timestamptz  default now() not null
);

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.user_profiles  enable row level security;
alter table public.applications   enable row level security;
alter table public.stories        enable row level security;
alter table public.point_events   enable row level security;
alter table public.user_progress  enable row level security;

-- user_profiles: id = auth.uid()
create policy "own profile" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- applications: user_id = auth.uid()
create policy "own applications" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- stories
create policy "own stories" on public.stories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- point_events
create policy "own point_events" on public.point_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_progress
create policy "own user_progress" on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- NOJOB — Supabase schema
-- Run in Supabase dashboard → SQL editor.
-- Safe to re-run: policies are dropped before recreate where needed.
-- ============================================================

-- user_profiles: one row per authenticated user
create table if not exists public.user_profiles (
  id              uuid references auth.users on delete cascade primary key,
  full_name       text not null default '',
  email           text not null default '',
  resume_text     text,
  resume_file_name text,
  resume_updated_at timestamptz,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

-- Existing projects: add resume columns if the table predates them
alter table public.user_profiles add column if not exists resume_text text;
alter table public.user_profiles add column if not exists resume_file_name text;
alter table public.user_profiles add column if not exists resume_updated_at timestamptz;
alter table public.user_profiles add column if not exists applied_manual_sort boolean default false not null;
alter table public.user_profiles add column if not exists tracker_column_order jsonb;

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
  has_response    boolean default false not null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);
create index if not exists applications_user_id_idx on public.applications(user_id);

-- Existing DBs: add sticky response flag + backfill
alter table public.applications add column if not exists has_response boolean default false not null;

update public.applications
set has_response = true
where status in ('recruiter_screen', 'interviewing', 'offer');

update public.applications a
set has_response = true
where exists (
  select 1
  from public.point_events p
  where p.application_id = a.id
    and p.user_id = a.user_id
    and p.event_type in (
      'status_recruiter_screen',
      'status_interviewing',
      'status_offer',
      'recruiter_screen',
      'interview_scheduled',
      'offer_received'
    )
);

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
  current_streak     integer      default 0    not null,
  longest_streak     integer      default 0    not null,
  last_streak_date   date,
  created_at         timestamptz  default now() not null,
  updated_at         timestamptz  default now() not null
);

alter table public.user_progress add column if not exists current_streak integer not null default 0;
alter table public.user_progress add column if not exists longest_streak integer not null default 0;
alter table public.user_progress add column if not exists last_streak_date date;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.user_profiles  enable row level security;
alter table public.applications   enable row level security;
alter table public.stories        enable row level security;
alter table public.point_events   enable row level security;
alter table public.user_progress  enable row level security;

-- Policies (drop first so this file can be re-run after partial applies)
drop policy if exists "own profile" on public.user_profiles;
create policy "own profile" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own applications" on public.applications;
create policy "own applications" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own stories" on public.stories;
create policy "own stories" on public.stories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own point_events" on public.point_events;
create policy "own point_events" on public.point_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Friend handles + graph (DDL before policies that reference friendships) ─

alter table public.user_profiles add column if not exists username text;
alter table public.user_profiles add column if not exists display_name text;

create unique index if not exists user_profiles_username_lower_key
  on public.user_profiles (lower(btrim(username)))
  where username is not null and btrim(username) <> '';

alter table public.user_progress add column if not exists max_apps_one_day integer not null default 0;
alter table public.user_progress add column if not exists achievements_unlocked_count integer not null default 0;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint friendships_no_self check (requester_id <> receiver_id)
);

create index if not exists friendships_requester_idx on public.friendships(requester_id);
create index if not exists friendships_receiver_idx on public.friendships(receiver_id);

create unique index if not exists friendships_pair_active_unique on public.friendships (
  least(requester_id, receiver_id),
  greatest(requester_id, receiver_id)
) where status in ('pending', 'accepted');

-- user_progress (split policies — friends may SELECT accepted peers’ progress only)
drop policy if exists "own user_progress" on public.user_progress;
drop policy if exists "user_progress_select_own_or_friend" on public.user_progress;
drop policy if exists "user_progress_insert_own" on public.user_progress;
drop policy if exists "user_progress_update_own" on public.user_progress;
drop policy if exists "user_progress_delete_own" on public.user_progress;

create policy "user_progress_select_own_or_friend" on public.user_progress
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.receiver_id = user_progress.user_id)
          or (f.receiver_id = auth.uid() and f.requester_id = user_progress.user_id)
        )
    )
  );

create policy "user_progress_insert_own" on public.user_progress
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "user_progress_update_own" on public.user_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_progress_delete_own" on public.user_progress
  for delete to authenticated
  using (user_id = auth.uid());

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_participant" on public.friendships;
drop policy if exists "friendships_insert_as_requester" on public.friendships;
drop policy if exists "friendships_update_participant" on public.friendships;
drop policy if exists "friendships_delete_participant" on public.friendships;

create policy "friendships_select_participant" on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or receiver_id = auth.uid());

create policy "friendships_insert_as_requester" on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid());

create policy "friendships_update_participant" on public.friendships
  for update to authenticated
  using (requester_id = auth.uid() or receiver_id = auth.uid())
  with check (requester_id = auth.uid() or receiver_id = auth.uid());

create policy "friendships_delete_participant" on public.friendships
  for delete to authenticated
  using (requester_id = auth.uid() or receiver_id = auth.uid());

-- Username availability (signup + profile). Does not expose who owns a taken name.
create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  norm text := lower(btrim(coalesce(p_username, '')));
  uid uuid := auth.uid();
  taken_by uuid;
begin
  if norm is null or norm = '' then
    return false;
  end if;
  select p.id into taken_by
  from public.user_profiles p
  where lower(btrim(p.username)) = norm
  limit 1;
  if taken_by is null then
    return true;
  end if;
  if uid is not null and taken_by = uid then
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- Search by handle: returns only public columns (no email / resume).
create or replace function public.search_profiles_by_username(p_term text, p_limit integer default 20)
returns table (
  id uuid,
  username text,
  display_name text,
  full_name text,
  current_rank text,
  total_points integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := lower(btrim(regexp_replace(coalesce(p_term, ''), '[^a-z0-9_.]', '', 'g')));
  lim int := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if length(q) < 1 then
    return;
  end if;

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.full_name,
    pr.current_rank,
    pr.total_points
  from public.user_profiles p
  inner join public.user_progress pr on pr.user_id = p.id
  where p.id <> auth.uid()
    and p.username is not null
    and btrim(p.username) <> ''
    and lower(p.username) like '%' || q || '%'
  order by char_length(p.username) asc, p.username asc
  limit lim;
end;
$$;

revoke all on function public.search_profiles_by_username(text, integer) from public;
grant execute on function public.search_profiles_by_username(text, integer) to authenticated;

-- Batch public cards for accepted friends only (RLS-safe fields).
create or replace function public.get_accepted_friend_public_cards(p_friend_ids uuid[])
returns table (
  user_id uuid,
  username text,
  display_name text,
  full_name text,
  current_rank text,
  total_points integer,
  current_streak integer,
  longest_streak integer,
  max_apps_one_day integer,
  achievements_unlocked_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.full_name,
    pr.current_rank,
    pr.total_points,
    pr.current_streak,
    pr.longest_streak,
    pr.max_apps_one_day,
    pr.achievements_unlocked_count
  from public.user_profiles p
  inner join public.user_progress pr on pr.user_id = p.id
  where p.id = any(p_friend_ids)
    and p.username is not null
    and btrim(p.username) <> ''
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.receiver_id = p.id)
          or (f.receiver_id = auth.uid() and f.requester_id = p.id)
        )
    );
$$;

revoke all on function public.get_accepted_friend_public_cards(uuid[]) from public;
grant execute on function public.get_accepted_friend_public_cards(uuid[]) to authenticated;

-- Pending requests to me: safe public fields only (no email / applications).
create or replace function public.get_pending_incoming_friend_requests()
returns table (
  friendship_id uuid,
  requester_id uuid,
  username text,
  display_name text,
  full_name text,
  current_rank text,
  total_points integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.requester_id,
    p.username,
    p.display_name,
    p.full_name,
    pr.current_rank,
    pr.total_points
  from public.friendships f
  inner join public.user_profiles p on p.id = f.requester_id
  inner join public.user_progress pr on pr.user_id = f.requester_id
  where f.receiver_id = auth.uid()
    and f.status = 'pending';
$$;

revoke all on function public.get_pending_incoming_friend_requests() from public;
grant execute on function public.get_pending_incoming_friend_requests() to authenticated;

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

-- Application grade & follow-up / self-score
alter table public.applications add column if not exists follow_up_sent boolean default false not null;
alter table public.applications add column if not exists follow_up_sent_at timestamptz;
alter table public.applications add column if not exists interview_self_score smallint;
alter table public.applications add column if not exists interview_self_notes text;
alter table public.applications add column if not exists application_grade text;
alter table public.applications add column if not exists application_grade_updated_at timestamptz;

alter table public.applications drop constraint if exists applications_interview_self_score_range;
alter table public.applications add constraint applications_interview_self_score_range
  check (interview_self_score is null or (interview_self_score >= 1 and interview_self_score <= 5));

alter table public.applications drop constraint if exists applications_application_grade_check;
alter table public.applications add constraint applications_application_grade_check
  check (application_grade is null or application_grade in ('A', 'B', 'C', 'D', 'F'));

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

alter table public.user_profiles add column if not exists avatar_url text;

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

-- OUT / returns table shape changed (avatar_url). PG cannot CREATE OR REPLACE a different row type.
drop function if exists public.search_profiles_by_username(text, integer);
drop function if exists public.get_accepted_friend_public_cards(uuid[]);
drop function if exists public.get_pending_incoming_friend_requests();
drop function if exists public.get_weekly_applications_leaderboard(date, date, text);

-- Search by handle: returns only public columns (no email / resume).
create or replace function public.search_profiles_by_username(p_term text, p_limit integer default 20)
returns table (
  id uuid,
  username text,
  display_name text,
  full_name text,
  current_rank text,
  total_points integer,
  avatar_url text
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
    pr.total_points,
    p.avatar_url
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
  achievements_unlocked_count integer,
  avatar_url text
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
    pr.achievements_unlocked_count,
    p.avatar_url
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
  total_points integer,
  avatar_url text
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
    pr.total_points,
    p.avatar_url
  from public.friendships f
  inner join public.user_profiles p on p.id = f.requester_id
  inner join public.user_progress pr on pr.user_id = f.requester_id
  where f.receiver_id = auth.uid()
    and f.status = 'pending';
$$;

revoke all on function public.get_pending_incoming_friend_requests() from public;
grant execute on function public.get_pending_incoming_friend_requests() to authenticated;

-- Aggregated achievement counts for an accepted friend (no application row details returned).
create or replace function public.get_friend_achievement_summary(p_friend_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  friends_ok boolean;
  jobs_n bigint;
  max_day bigint;
  screens_n bigint;
  interviews_n bigint;
  offers_n bigint;
  followups_n bigint;
  prep_n bigint;
  stories_n bigint;
  rejects_n bigint;
  longest_n integer;
  current_n integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.receiver_id = p_friend_user_id)
        or (f.receiver_id = auth.uid() and f.requester_id = p_friend_user_id)
      )
  ) into friends_ok;

  if not friends_ok then
    return jsonb_build_object('ok', false, 'error', 'not_friends');
  end if;

  select count(*)::bigint into jobs_n
  from public.applications a where a.user_id = p_friend_user_id;

  with per_day as (
    select coalesce(a.date_applied, (a.created_at at time zone 'utc')::date) as d, count(*)::bigint as c
    from public.applications a
    where a.user_id = p_friend_user_id
    group by 1
  )
  select coalesce(max(c), 0) into max_day from per_day;

  select count(*)::bigint into screens_n
  from public.point_events e
  where e.user_id = p_friend_user_id and e.event_type = 'status_recruiter_screen';

  select count(*)::bigint into interviews_n
  from public.point_events e
  where e.user_id = p_friend_user_id and e.event_type = 'status_interviewing';

  select count(*)::bigint into offers_n
  from public.point_events e
  where e.user_id = p_friend_user_id and e.event_type = 'status_offer';

  select count(*)::bigint into followups_n
  from public.point_events e
  where e.user_id = p_friend_user_id and e.event_type = 'follow_up_sent';

  select count(*)::bigint into prep_n
  from public.point_events e
  where e.user_id = p_friend_user_id and e.event_type = 'interview_prep_generated';

  select count(*)::bigint into stories_n
  from public.stories s where s.user_id = p_friend_user_id;

  select count(*)::bigint into rejects_n
  from public.applications a
  where a.user_id = p_friend_user_id and a.status = 'rejected';

  select coalesce(max(pr.longest_streak), 0), coalesce(max(pr.current_streak), 0)
  into longest_n, current_n
  from public.user_progress pr
  where pr.user_id = p_friend_user_id;

  return jsonb_build_object(
    'ok', true,
    'current_streak', current_n,
    'counts', jsonb_build_object(
      'jobs_applied', jobs_n,
      'max_apps_one_day', max_day,
      'recruiter_screens', screens_n,
      'interviews', interviews_n,
      'offers', offers_n,
      'follow_ups', followups_n,
      'prep_kits', prep_n,
      'star_stories', stories_n,
      'resilience', rejects_n,
      'longest_streak', longest_n
    )
  );
end;
$$;

revoke all on function public.get_friend_achievement_summary(uuid) from public;
grant execute on function public.get_friend_achievement_summary(uuid) to authenticated;

-- Weekly application counts for you + accepted friends only (aggregates; no job rows exposed).
create or replace function public.get_weekly_applications_leaderboard(
  p_week_start date,
  p_week_end date,
  p_tz text default 'UTC'
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  full_name text,
  current_rank text,
  apps_this_week bigint,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  tz text := coalesce(nullif(trim(p_tz), ''), 'UTC');
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  return query
  with cohort as (
    select me as uid
    union
    select case when f.requester_id = me then f.receiver_id else f.requester_id end
    from public.friendships f
    where f.status = 'accepted'
      and (f.requester_id = me or f.receiver_id = me)
  ),
  counts as (
    select
      a.user_id,
      count(*)::bigint as n
    from public.applications a
    inner join cohort c on c.uid = a.user_id
    where coalesce(a.date_applied, (a.created_at at time zone tz)::date) >= p_week_start
      and coalesce(a.date_applied, (a.created_at at time zone tz)::date) <= p_week_end
    group by a.user_id
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.full_name,
    pr.current_rank,
    coalesce(ct.n, 0)::bigint,
    p.avatar_url
  from cohort co
  inner join public.user_profiles p on p.id = co.uid
  inner join public.user_progress pr on pr.user_id = co.uid
  left join counts ct on ct.user_id = co.uid
  order by coalesce(ct.n, 0) desc, p.id asc;
end;
$$;

revoke all on function public.get_weekly_applications_leaderboard(date, date, text) from public;
grant execute on function public.get_weekly_applications_leaderboard(date, date, text) to authenticated;

-- ── Profile pictures (Storage) ──────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_pictures_select_public" on storage.objects;
create policy "profile_pictures_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'profile-pictures');

drop policy if exists "profile_pictures_insert_own" on storage.objects;
create policy "profile_pictures_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_pictures_update_own" on storage.objects;
create policy "profile_pictures_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_pictures_delete_own" on storage.objects;
create policy "profile_pictures_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Achievement level-up notifications (cross-device) ─────────────────────

create table if not exists public.achievement_last_notified_tier (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_key text not null,
  tier_token text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

create table if not exists public.achievement_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_key text not null,
  old_tier text not null,
  new_tier text not null,
  seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists achievement_notifications_user_unseen_idx
  on public.achievement_notifications (user_id, created_at)
  where seen_at is null;

alter table public.achievement_last_notified_tier enable row level security;
alter table public.achievement_notifications enable row level security;

drop policy if exists "achievement_last_notified_tier_own" on public.achievement_last_notified_tier;
create policy "achievement_last_notified_tier_own"
  on public.achievement_last_notified_tier
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "achievement_notifications_own" on public.achievement_notifications;
create policy "achievement_notifications_own"
  on public.achievement_notifications
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

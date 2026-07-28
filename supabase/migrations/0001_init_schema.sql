-- TFE Journal — 0001_init_schema.sql
-- Build order step 1: schema + RLS. No app logic, no rule-breach computation
-- (that's step 7), no r_multiple trigger — those columns exist but are
-- populated by the app until we build the automatic checks.
--
-- Confirmed R-multiple formula for step 7:
--   r_multiple = pnl / (abs(entry_price - stop_loss) * size * point_value)

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================
-- Enums
-- ============================================================
create type user_role as enum ('student', 'mentor');
create type user_tier as enum ('lead_mentor', 'mentor', 'vip', 'alumni');
create type roadmap_stage as enum ('foundations', 'strategy', 'prop_setup', 'evaluation', 'funded');
create type trade_direction as enum ('long', 'short');
create type trade_account_type as enum ('sim', 'evaluation', 'funded');
create type mistake_tag as enum ('none', 'moved_stop', 'early_exit', 'revenge_trade', 'oversized', 'no_setup', 'chased_entry');
create type emotion as enum ('calm', 'confident', 'focused', 'impatient', 'anxious', 'fearful', 'greedy', 'frustrated', 'revengeful', 'bored', 'overconfident', 'numb');

-- ============================================================
-- users
-- 1:1 with auth.users. Profile + permission + cosmetic-tier data.
-- ============================================================
create table public.users (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text not null unique,
  display_name   text not null,
  role           user_role not null default 'student',
  tier           user_tier not null default 'vip',
  roadmap_stage  roadmap_stage not null default 'foundations',
  account_size   numeric not null default 0,          -- needed for rule 02 (1% risk check)
  timezone       text not null default 'UTC',          -- needed for rule 03 (Friday check per-user, not UTC)
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on column public.users.account_size is 'Account size in account currency, used to check the 1% max risk rule.';
comment on column public.users.timezone is 'IANA timezone name, e.g. Europe/London — rule checks (no-Friday etc.) must use this, not UTC.';

-- ============================================================
-- instrument_point_values
-- Lookup so ES/MES etc. can be added later without touching code.
-- ============================================================
create table public.instrument_point_values (
  instrument   text primary key,
  point_value  numeric not null
);

insert into public.instrument_point_values (instrument, point_value) values
  ('NQ', 20),
  ('MNQ', 2);

-- ============================================================
-- trades
-- ============================================================
create table public.trades (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  instrument       text not null default 'NQ' references public.instrument_point_values (instrument),
  direction        trade_direction not null,
  entry_datetime   timestamptz not null,
  exit_datetime    timestamptz,
  entry_price      numeric not null,
  exit_price       numeric,
  stop_loss        numeric not null,
  take_profit      numeric,
  size             integer not null check (size > 0),
  pnl              numeric,
  r_multiple       numeric,                            -- app-computed for now; see step 7
  account_type     trade_account_type not null default 'sim',
  setup_tag        text,
  followed_plan    boolean not null,
  mistake_tag      mistake_tag not null default 'none',
  emotion_before   emotion,
  emotion_during   emotion,
  emotion_after    emotion,
  emotion_notes    text,
  screenshot_url   text not null,
  notes            text,
  rule_breaches    integer[] not null default '{}',    -- app/edge-function computed; see step 7
  created_at       timestamptz not null default now()
);

create index trades_user_id_idx on public.trades (user_id);
create index trades_entry_datetime_idx on public.trades (entry_datetime);
create index trades_setup_tag_idx on public.trades (setup_tag);

-- ============================================================
-- daily_reviews
-- ============================================================
create table public.daily_reviews (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users (id) on delete cascade,
  date              date not null,
  overall_emotion   emotion,
  what_went_well    text,
  what_to_fix       text,
  homework_done     boolean not null default false,
  notes             text,
  unique (user_id, date)
);

-- ============================================================
-- mentor_comments
-- Exactly one of trade_id / daily_review_id must be set.
-- ============================================================
create table public.mentor_comments (
  id                uuid primary key default gen_random_uuid(),
  trade_id          uuid references public.trades (id) on delete cascade,
  daily_review_id   uuid references public.daily_reviews (id) on delete cascade,
  mentor_id         uuid not null references public.users (id) on delete cascade,
  body              text not null,
  created_at        timestamptz not null default now(),
  constraint mentor_comments_target_check check (num_nonnulls(trade_id, daily_review_id) = 1)
);

create index mentor_comments_trade_id_idx on public.mentor_comments (trade_id);
create index mentor_comments_daily_review_id_idx on public.mentor_comments (daily_review_id);

-- ============================================================
-- blackout_dates
-- Mentor-maintained: NFP weeks, bank holidays, declared no-news Mondays.
-- v1 for rules 04/05 — we do not guess at external news data.
-- ============================================================
create table public.blackout_dates (
  id           uuid primary key default gen_random_uuid(),
  date         date not null unique,
  reason       text not null,
  created_by   uuid not null references public.users (id),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- Helper functions for RLS
-- SECURITY DEFINER so they can read public.users without recursing
-- back into the users table's own RLS policy.
-- ============================================================
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and active = true
  );
$$;

create or replace function public.is_active_mentor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and active = true and role = 'mentor'
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.users enable row level security;
alter table public.instrument_point_values enable row level security;
alter table public.trades enable row level security;
alter table public.daily_reviews enable row level security;
alter table public.mentor_comments enable row level security;
alter table public.blackout_dates enable row level security;

-- users: everyone active can read (needed for names/tiers on scoreboard/feed).
-- only mentors can create or modify user rows (accounts are created manually).
-- no delete policy — accounts are deactivated, never deleted.
create policy users_select_active on public.users
  for select
  using (public.is_active_user());

create policy users_insert_mentor on public.users
  for insert
  with check (public.is_active_mentor());

create policy users_update_mentor on public.users
  for update
  using (public.is_active_mentor())
  with check (public.is_active_mentor());

-- instrument_point_values: readable by any active user, writable by mentors only.
create policy point_values_select_active on public.instrument_point_values
  for select
  using (public.is_active_user());

create policy point_values_write_mentor on public.instrument_point_values
  for all
  using (public.is_active_mentor())
  with check (public.is_active_mentor());

-- trades: shared read for all active users; write only your own rows.
create policy trades_select_active on public.trades
  for select
  using (public.is_active_user());

create policy trades_insert_own on public.trades
  for insert
  with check (user_id = auth.uid() and public.is_active_user());

create policy trades_update_own on public.trades
  for update
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid());

create policy trades_delete_own on public.trades
  for delete
  using (user_id = auth.uid() and public.is_active_user());

-- daily_reviews: same shared-read / own-write pattern as trades.
create policy daily_reviews_select_active on public.daily_reviews
  for select
  using (public.is_active_user());

create policy daily_reviews_insert_own on public.daily_reviews
  for insert
  with check (user_id = auth.uid() and public.is_active_user());

create policy daily_reviews_update_own on public.daily_reviews
  for update
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid());

create policy daily_reviews_delete_own on public.daily_reviews
  for delete
  using (user_id = auth.uid() and public.is_active_user());

-- mentor_comments: everyone active can read; only mentors can write, and only
-- their own comments (mentor_id must match the caller).
create policy mentor_comments_select_active on public.mentor_comments
  for select
  using (public.is_active_user());

create policy mentor_comments_insert_mentor on public.mentor_comments
  for insert
  with check (public.is_active_mentor() and mentor_id = auth.uid());

create policy mentor_comments_update_own on public.mentor_comments
  for update
  using (public.is_active_mentor() and mentor_id = auth.uid())
  with check (mentor_id = auth.uid());

create policy mentor_comments_delete_own on public.mentor_comments
  for delete
  using (public.is_active_mentor() and mentor_id = auth.uid());

-- blackout_dates: everyone active can read (calendar needs it), mentors write.
create policy blackout_dates_select_active on public.blackout_dates
  for select
  using (public.is_active_user());

create policy blackout_dates_write_mentor on public.blackout_dates
  for all
  using (public.is_active_mentor())
  with check (public.is_active_mentor());

-- ============================================================
-- Storage: trade screenshots
-- Authenticated-read only, no public URLs. Students upload/read/delete
-- only within their own folder (path prefixed with their user id);
-- everyone active can read (shared journal), matching the trades table.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do nothing;

create policy screenshots_select_active on storage.objects
  for select
  using (
    bucket_id = 'trade-screenshots'
    and public.is_active_user()
  );

create policy screenshots_insert_own on storage.objects
  for insert
  with check (
    bucket_id = 'trade-screenshots'
    and public.is_active_user()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy screenshots_delete_own on storage.objects
  for delete
  using (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

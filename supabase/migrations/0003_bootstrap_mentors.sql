-- TFE Journal — 0003_bootstrap_mentors.sql
-- One-time bootstrap: the two mentor auth.users accounts already exist
-- (created directly in Supabase Auth), but public.users has no matching
-- profile rows for them. The app can't self-bootstrap this — the
-- users_insert_mentor RLS policy requires an *existing* active mentor to
-- insert a users row, so the very first mentor(s) must go in via the SQL
-- editor running as postgres, which bypasses RLS.
--
-- Fill in the real emails and display names below, then run in the
-- Supabase SQL editor. Safe to run once; re-running is a no-op for any
-- email that already has a public.users row (see ON CONFLICT below).

-- Anton — lead mentor, gold tier
insert into public.users (id, email, display_name, role, tier, roadmap_stage, active)
select id, email, 'Anton', 'mentor', 'lead_mentor', 'foundations', true
from auth.users
where email = 'cugz2001@gmail.com'
on conflict (id) do nothing;

-- Jordan — mentor, bronze tier
insert into public.users (id, email, display_name, role, tier, roadmap_stage, active)
select id, email, 'Jordan', 'mentor', 'mentor', 'foundations', true
from auth.users
where email = 'jordan.tep@icloud.com'
on conflict (id) do nothing;

-- Sanity check — should return both rows with role = 'mentor'.
select id, email, display_name, role, tier, active from public.users;

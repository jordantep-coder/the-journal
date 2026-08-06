-- TFE Journal — 0008_screenshot_edit_and_social.sql
--
-- Four unrelated additions bundled into one migration since they landed in
-- the same session:
--
-- 1. screenshot_url becomes nullable — the trade detail page now lets the
--    owner replace or remove an already-logged trade's screenshot (storage
--    insert/delete already covered by 0001's screenshots_insert_own /
--    screenshots_delete_own policies, so no storage RLS changes needed
--    here). LogTrade.jsx still requires a file at creation time; this only
--    relaxes the column so it can be cleared later.
--
-- 2. risk_amount — the dollar amount actually risked on the trade, entered
--    manually by the trader. Root-caused the Avg R bug: r_multiple was
--    being derived from entry_price/stop_loss/size, and stop_loss was being
--    logged as something other than the trader's real stop (confirmed on
--    Anton's data — implied dollar risk didn't match what he actually
--    risked). r_multiple is now pnl / risk_amount instead — see
--    computeRMultiple in LogTrade.jsx. stop_loss stays on the row as a
--    recorded field; it's just no longer R's basis. Nullable because every
--    existing trade has no risk_amount and thus no r_multiple until
--    back-filled (LogTrade.jsx makes it required going forward so this
--    can't drift again the same way).
--
-- 3. trade_comments — Instagram-style comments on any trade, visible to the
--    whole cohort. Distinct from mentor_comments (0001): that table stays
--    mentor-only official feedback; this one is any-active-user, same
--    shared-read/own-write shape as trades itself.
--
-- 4. trade_likes — likes on trades AND on trade_comments, same "exactly one
--    target" pattern mentor_comments already uses for trade_id/
--    daily_review_id. Postgres UNIQUE treats NULLs as distinct, so a plain
--    unique(trade_id, comment_id, user_id) would NOT stop someone
--    double-liking the same trade — hence the two partial unique indexes
--    below instead of a table-level constraint.

alter table public.trades alter column screenshot_url drop not null;

alter table public.trades add column risk_amount numeric check (risk_amount is null or risk_amount > 0);

comment on column public.trades.risk_amount is 'Dollar amount risked on the trade, entered manually by the trader. Basis for r_multiple = pnl / risk_amount. Null on every trade logged before this column existed — back-fill separately, do not infer from entry_price/stop_loss/size.';

-- ============================================================
-- trade_comments
-- ============================================================
create table public.trade_comments (
  id           uuid primary key default gen_random_uuid(),
  trade_id     uuid not null references public.trades (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now()
);

create index trade_comments_trade_id_idx on public.trade_comments (trade_id);

alter table public.trade_comments enable row level security;

create policy trade_comments_select_active on public.trade_comments
  for select
  using (public.is_active_user());

create policy trade_comments_insert_own on public.trade_comments
  for insert
  with check (user_id = auth.uid() and public.is_active_user());

create policy trade_comments_update_own on public.trade_comments
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy trade_comments_delete_own on public.trade_comments
  for delete
  using (user_id = auth.uid());

-- ============================================================
-- trade_likes
-- Exactly one of trade_id / comment_id is set (mirrors mentor_comments'
-- trade_id / daily_review_id target-check from 0001). No update policy —
-- a like is a toggle (insert to like, delete to unlike), nothing to edit.
-- ============================================================
create table public.trade_likes (
  id           uuid primary key default gen_random_uuid(),
  trade_id     uuid references public.trades (id) on delete cascade,
  comment_id   uuid references public.trade_comments (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint trade_likes_target_check check (num_nonnulls(trade_id, comment_id) = 1)
);

-- Partial unique indexes (not a table-level unique constraint) because
-- NULLs are distinct under UNIQUE — with comment_id always null on a trade
-- like, a plain unique(trade_id, comment_id, user_id) would let the same
-- user like the same trade any number of times.
create unique index trade_likes_trade_user_uniq on public.trade_likes (trade_id, user_id) where comment_id is null;
create unique index trade_likes_comment_user_uniq on public.trade_likes (comment_id, user_id) where trade_id is null;

create index trade_likes_trade_id_idx on public.trade_likes (trade_id);
create index trade_likes_comment_id_idx on public.trade_likes (comment_id);

alter table public.trade_likes enable row level security;

create policy trade_likes_select_active on public.trade_likes
  for select
  using (public.is_active_user());

create policy trade_likes_insert_own on public.trade_likes
  for insert
  with check (user_id = auth.uid() and public.is_active_user());

create policy trade_likes_delete_own on public.trade_likes
  for delete
  using (user_id = auth.uid());

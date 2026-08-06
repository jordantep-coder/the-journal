-- TFE Journal — 0009_reactions.sql
--
-- Replaces trade_likes (0008) with trade_reactions — emoji reactions on
-- trades and comments, not a separate like system running alongside them.
-- Fixed set of exactly five emoji, enforced by a Postgres enum rather than
-- free text (no picker, no custom emoji, per spec). One reaction per user
-- per target: switching emoji is an UPDATE on the existing row, so there IS
-- an update policy here unlike 0008's like-only trade_likes.
--
-- Existing likes carry real engagement history, so they're migrated rather
-- than dropped — each becomes a ❤️ reaction (the closest equivalent) before
-- trade_likes goes away.

create type trade_reaction_emoji as enum ('🔥', '❤️', '😳', '😭', '😡');

create table public.trade_reactions (
  id           uuid primary key default gen_random_uuid(),
  trade_id     uuid references public.trades (id) on delete cascade,
  comment_id   uuid references public.trade_comments (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  emoji        trade_reaction_emoji not null,
  created_at   timestamptz not null default now(),
  constraint trade_reactions_target_check check (num_nonnulls(trade_id, comment_id) = 1)
);

-- One reaction per user per target regardless of emoji — not one per
-- (user, target, emoji) — so switching is an update, not a second row.
-- Partial (not table-level) for the same reason as 0008's trade_likes:
-- NULLs are distinct under UNIQUE, so a plain
-- unique(trade_id, comment_id, user_id) would not stop duplicates on
-- whichever column is always null for a given row.
create unique index trade_reactions_trade_user_uniq on public.trade_reactions (trade_id, user_id) where comment_id is null;
create unique index trade_reactions_comment_user_uniq on public.trade_reactions (comment_id, user_id) where trade_id is null;

create index trade_reactions_trade_id_idx on public.trade_reactions (trade_id);
create index trade_reactions_comment_id_idx on public.trade_reactions (comment_id);

alter table public.trade_reactions enable row level security;

create policy trade_reactions_select_active on public.trade_reactions
  for select
  using (public.is_active_user());

create policy trade_reactions_insert_own on public.trade_reactions
  for insert
  with check (user_id = auth.uid() and public.is_active_user());

create policy trade_reactions_update_own on public.trade_reactions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy trade_reactions_delete_own on public.trade_reactions
  for delete
  using (user_id = auth.uid());

-- ============================================================
-- Migrate existing likes, then remove the old table. drop table cascades
-- away trade_likes' own policies/indexes — nothing else references it.
-- ============================================================
insert into public.trade_reactions (trade_id, comment_id, user_id, emoji, created_at)
select trade_id, comment_id, user_id, '❤️', created_at
from public.trade_likes;

drop table public.trade_likes;

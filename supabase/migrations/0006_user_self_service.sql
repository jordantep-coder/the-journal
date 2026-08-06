-- TFE Journal — 0006_user_self_service.sql
-- Settings/Profile page: lets a student edit their own display_name,
-- avatar_url, and roadmap_stage directly. Previously users_update_mentor
-- was the ONLY update policy on this table, so self-service required a new
-- one. RLS only gates which ROWS a policy applies to, not which columns —
-- so a BEFORE UPDATE trigger does the column-level enforcement: a non-mentor
-- editing their own row may only change those three columns; tier, active,
-- role, account_size, timezone, email still require a mentor, same as before
-- 0001's users_update_mentor policy already covers that path unchanged.

alter table public.users add column avatar_url text;

create policy users_update_own on public.users
  for update
  using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid());

create or replace function public.enforce_users_self_update_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Mentors keep unrestricted write access (existing users_update_mentor
  -- policy) — this trigger only narrows the self-service path.
  if public.is_active_mentor() then
    return new;
  end if;

  if new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.tier is distinct from old.tier
    or new.account_size is distinct from old.account_size
    or new.timezone is distinct from old.timezone
    or new.active is distinct from old.active
    or new.created_at is distinct from old.created_at
  then
    raise exception 'You can only change your display name, avatar, and roadmap stage.';
  end if;

  return new;
end;
$$;

create trigger users_self_update_guard
  before update on public.users
  for each row
  execute function public.enforce_users_self_update_columns();

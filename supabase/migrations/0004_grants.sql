-- TFE Journal — 0004_grants.sql
-- Fixes "permission denied for table users" on login.
--
-- RLS policies restrict which ROWS a role can see/touch, but a role needs
-- the underlying table GRANT before RLS is even evaluated. Normal Supabase
-- projects set this up automatically via default privileges on the public
-- schema; this project's public schema came up empty with none of that
-- scaffolding, so 0001 created tables that were never actually granted to
-- the authenticated role. RLS policies are the real access control here —
-- these grants just open the door RLS then filters.

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant execute on all functions in schema public to authenticated, anon;

-- So tables created by any future migration inherit the same grants
-- automatically, instead of needing this file re-run every time.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant execute on functions to authenticated, anon;

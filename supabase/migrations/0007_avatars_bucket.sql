-- TFE Journal — 0007_avatars_bucket.sql
-- Profile picture storage for the Settings page. Public read (avatars need
-- to show up for the whole team on Scoreboard/Team Stats/My Journal without
-- an authenticated fetch); upload/replace restricted to each user's own
-- folder, same auth-id-prefixed-path pattern as the trade-screenshots
-- bucket in 0001, just with public=true instead of authenticated-only reads.
--
-- No Supabase CLI linked in this repo to query the live project directly —
-- on conflict do nothing makes this safe to run whether or not the bucket
-- already exists (same guard 0001 used for trade-screenshots).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_select_public on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy avatars_insert_own on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and public.is_active_user()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update_own on storage.objects
  for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete_own on storage.objects
  for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

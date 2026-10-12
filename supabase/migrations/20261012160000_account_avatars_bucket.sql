-- MULTISPORTS SCORING — avatar de compte multi-appareils
-- Source durable : Supabase Storage public bucket `avatars`.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict(id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars_public_read') then
    create policy avatars_public_read on storage.objects
      for select using (bucket_id='avatars');
  end if;

  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars_user_insert') then
    create policy avatars_user_insert on storage.objects
      for insert to authenticated
      with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;

  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars_user_update') then
    create policy avatars_user_update on storage.objects
      for update to authenticated
      using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text)
      with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;

  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars_user_delete') then
    create policy avatars_user_delete on storage.objects
      for delete to authenticated
      using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
end $$;

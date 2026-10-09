-- Profile page: avatar and short bio.

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "profile_avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

create policy "profile_avatars_own_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select p.id::text from public.profiles p where p.auth_id = auth.uid()
    )
  );

create policy "profile_avatars_own_update"
  on storage.objects for update
  using (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
  );

create policy "profile_avatars_own_delete"
  on storage.objects for delete
  using (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
  );

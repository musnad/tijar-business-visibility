-- Business profile: logo for shop page and public visibility.

alter table public.businesses
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-logos',
  'business-logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "business_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'business-logos');

create policy "business_logos_member_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'business-logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select b.id::text from public.businesses b
      inner join public.business_members m on m.business_id = b.id
      inner join public.profiles p on p.id = m.profile_id
      where p.auth_id = auth.uid()
    )
  );

create policy "business_logos_member_update"
  on storage.objects for update
  using (
    bucket_id = 'business-logos'
    and auth.role() = 'authenticated'
  );

create policy "business_logos_member_delete"
  on storage.objects for delete
  using (
    bucket_id = 'business-logos'
    and auth.role() = 'authenticated'
  );

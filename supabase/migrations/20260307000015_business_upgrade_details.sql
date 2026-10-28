-- Full business application details before admin approval.

alter table public.business_upgrade_requests
  add column if not exists description text,
  add column if not exists category_id uuid references public.business_categories (id) on delete set null,
  add column if not exists shop_image_url text,
  add column if not exists whatsapp text,
  add column if not exists state text,
  add column if not exists city text,
  add column if not exists street text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists public_location_label text;

comment on table public.business_upgrade_requests is
  'Customer applications to become informal TIJAR sellers. Admin must approve before dashboard access.';

-- Shop photos for upgrade applications (folder = profile id).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'upgrade-shop-images',
  'upgrade-shop-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "upgrade_shop_images_public_read" on storage.objects;
create policy "upgrade_shop_images_public_read"
  on storage.objects for select
  using (bucket_id = 'upgrade-shop-images');

drop policy if exists "upgrade_shop_images_own_write" on storage.objects;
create policy "upgrade_shop_images_own_write"
  on storage.objects for insert
  with check (
    bucket_id = 'upgrade-shop-images'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

drop policy if exists "upgrade_shop_images_own_update" on storage.objects;
create policy "upgrade_shop_images_own_update"
  on storage.objects for update
  using (
    bucket_id = 'upgrade-shop-images'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

drop policy if exists "upgrade_shop_images_own_delete" on storage.objects;
create policy "upgrade_shop_images_own_delete"
  on storage.objects for delete
  using (
    bucket_id = 'upgrade-shop-images'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

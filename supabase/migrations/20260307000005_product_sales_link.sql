-- Products: image + kind (goods vs service). Sales: link to product + profit snapshot.

create type public.product_kind as enum ('goods', 'service');

alter table public.products
  add column if not exists kind public.product_kind not null default 'goods',
  add column if not exists image_url text;

alter table public.transactions
  add column if not exists product_id uuid references public.products (id) on delete set null,
  add column if not exists quantity numeric(18, 3),
  add column if not exists line_cost numeric(18, 2),
  add column if not exists line_profit numeric(18, 2);

create index transactions_product_idx on public.transactions (product_id, occurred_at desc)
  where product_id is not null;

-- Product images (public read; members upload under business folder)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product_images_member_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select b.id::text from public.businesses b
      inner join public.business_members m on m.business_id = b.id
      inner join public.profiles p on p.id = m.profile_id
      where p.auth_id = auth.uid()
    )
  );

create policy "product_images_member_update"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

create policy "product_images_member_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

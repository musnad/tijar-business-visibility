-- Live shops may still be on the original products table (name, notes, price).
-- Add catalogue columns if they are missing, then list priced items in the shop.

do $$ begin
  create type public.product_kind as enum ('goods', 'service');
exception
  when duplicate_object then null;
end $$;

alter table public.products
  add column if not exists kind public.product_kind not null default 'goods',
  add column if not exists image_url text,
  add column if not exists description text,
  add column if not exists attributes jsonb not null default '{}'::jsonb,
  add column if not exists variants jsonb not null default '[]'::jsonb,
  add column if not exists extra_image_urls text[] not null default '{}',
  add column if not exists video_url text,
  add column if not exists currency text not null default 'NGN',
  add column if not exists is_published boolean not null default true,
  add column if not exists catalogue_category text,
  add column if not exists service_type text not null default 'general',
  add column if not exists starts_on date,
  add column if not exists ends_on date;

alter table public.businesses
  add column if not exists is_informal boolean not null default true,
  add column if not exists public_slug text,
  add column if not exists is_published boolean not null default false,
  add column if not exists logo_url text,
  add column if not exists category_id uuid;

drop view if exists public.public_business_products;

create view public.public_business_products as
select
  p.id,
  p.business_id,
  p.name,
  p.kind,
  coalesce(nullif(p.description, ''), p.notes) as description,
  p.sale_price,
  p.unit,
  p.image_url,
  p.extra_image_urls,
  p.video_url,
  p.attributes,
  p.variants,
  p.currency,
  p.catalogue_category,
  p.service_type,
  p.starts_on,
  p.ends_on,
  p.created_at,
  p.updated_at,
  (p.kind = 'service' or coalesce(p.stock_quantity, 0) > 0) as is_available,
  p.stock_quantity,
  coalesce(b.is_informal, true) as is_informal,
  b.business_name,
  b.public_slug as business_slug,
  b.logo_url as business_logo_url,
  coalesce(p.catalogue_category, c.name) as category_name
from public.products p
join public.businesses b on b.id = p.business_id
left join public.business_categories c on c.id = b.category_id
where p.is_active
  and coalesce(p.is_published, true)
  and p.sale_price is not null
  and coalesce(b.moderation_status::text, 'pending') not in ('flagged', 'suspended');

grant select on public.public_business_products to anon, authenticated;

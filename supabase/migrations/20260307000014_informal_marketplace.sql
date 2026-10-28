-- Marketplace sells only from informal TIJAR businesses (micro/traders/artisans).

alter table public.businesses
  add column if not exists is_informal boolean not null default true;

comment on column public.businesses.is_informal is
  'TIJAR Marketplace lists products only from informal businesses (default true for all TIJAR shops).';

-- Re-create public product view: published + approved + informal only.
create or replace view public.public_business_products as
select
  p.id,
  p.business_id,
  p.name,
  p.kind,
  p.notes as description,
  p.sale_price,
  p.unit,
  p.image_url,
  (p.kind = 'service' or p.stock_quantity > 0) as is_available,
  p.updated_at,
  b.is_informal,
  b.business_name,
  b.public_slug as business_slug,
  b.logo_url as business_logo_url,
  c.name as category_name
from public.products p
join public.businesses b on b.id = p.business_id
left join public.business_categories c on c.id = b.category_id
where p.is_active
  and b.is_published
  and b.moderation_status = 'approved'
  and b.is_informal = true;

grant select on public.public_business_products to anon, authenticated;

-- Listings view also marks informal (discover can still show all published; marketplace uses products).
create or replace view public.public_business_listings as
select
  b.id,
  b.public_slug as slug,
  b.business_name,
  b.description,
  b.location as location_text,
  b.public_location_label,
  b.latitude,
  b.longitude,
  b.logo_url,
  b.category_id,
  c.name as category_name,
  b.public_phone,
  b.public_whatsapp,
  b.opening_hours,
  (b.verification_status = 'verified') as is_verified,
  b.verification_status,
  b.published_at,
  b.updated_at,
  b.is_informal
from public.businesses b
left join public.business_categories c on c.id = b.category_id
where b.is_published
  and b.moderation_status = 'approved'
  and b.location_approved
  and b.latitude is not null
  and b.longitude is not null
  and b.public_slug is not null;

grant select on public.public_business_listings to anon, authenticated;

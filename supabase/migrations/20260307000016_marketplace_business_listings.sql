-- Marketplace landing lists every published informal shop (location optional).
-- Discover map still uses public_business_listings (coords required).

create or replace view public.public_marketplace_businesses as
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
  b.is_informal,
  b.moderation_status
from public.businesses b
left join public.business_categories c on c.id = b.category_id
where b.is_published
  and b.is_informal = true
  and b.public_slug is not null
  and b.moderation_status in ('approved', 'pending');

grant select on public.public_marketplace_businesses to anon, authenticated;

-- Phase 3: TIJAR Discover & local marketplace
-- Public storefronts, approved public coordinates, enquiries, moderation.
-- Privacy rule: a business is publicly discoverable ONLY when
--   is_published = true AND moderation_status = 'approved'
--   AND location_approved = true AND latitude/longitude are present.
-- Coordinates are owner-provided/approved; never inferred.

create extension if not exists postgis;

create type public.listing_moderation_status as enum ('pending', 'approved', 'flagged', 'suspended');

alter table public.businesses
  add column if not exists public_slug text,
  add column if not exists is_published boolean not null default false,
  add column if not exists public_phone text,
  add column if not exists public_whatsapp text,
  add column if not exists opening_hours jsonb not null default '{}'::jsonb,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists public_location_label text,
  add column if not exists location_approved boolean not null default false,
  add column if not exists moderation_status public.listing_moderation_status not null default 'pending',
  add column if not exists moderation_notes text,
  add column if not exists published_at timestamptz;

alter table public.businesses
  add constraint businesses_public_slug_format
    check (public_slug is null or public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint businesses_lat_range check (latitude is null or (latitude between -90 and 90)),
  add constraint businesses_lng_range check (longitude is null or (longitude between -180 and 180)),
  add constraint businesses_publish_needs_location
    check (not is_published or (latitude is not null and longitude is not null and location_approved));

create unique index if not exists businesses_public_slug_key
  on public.businesses (public_slug) where public_slug is not null;

-- Geographic index (point built from approved coordinates)
create index if not exists businesses_geo_idx
  on public.businesses using gist (
    (st_setsrid(st_makepoint(longitude, latitude), 4326)::geography)
  )
  where latitude is not null and longitude is not null;

create index if not exists businesses_discover_idx
  on public.businesses (is_published, moderation_status, category_id)
  where is_published;

-- ---------------------------------------------------------------------------
-- Public views: explicit public columns only. Private/financial data and
-- owner_id are never exposed. Views run with owner rights in Postgres, so
-- the WHERE clause below IS the visibility boundary — keep it strict.
-- ---------------------------------------------------------------------------
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
  b.updated_at
from public.businesses b
left join public.business_categories c on c.id = b.category_id
where b.is_published
  and b.moderation_status = 'approved'
  and b.location_approved
  and b.latitude is not null
  and b.longitude is not null
  and b.public_slug is not null;

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
  p.updated_at
from public.products p
join public.businesses b on b.id = p.business_id
where p.is_active
  and b.is_published
  and b.moderation_status = 'approved';

grant select on public.public_business_listings to anon, authenticated;
grant select on public.public_business_products to anon, authenticated;

-- Nearby search backed by the geography index. Returns distance in km.
create or replace function public.nearby_businesses(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 25,
  p_category_id uuid default null,
  p_query text default null,
  p_limit int default 100
)
returns table (
  id uuid, slug text, business_name text, description text,
  location_text text, public_location_label text,
  latitude double precision, longitude double precision,
  logo_url text, category_id uuid, category_name text,
  public_phone text, public_whatsapp text, opening_hours jsonb,
  is_verified boolean, verification_status public.verification_status,
  distance_km double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id, l.slug, l.business_name, l.description, l.location_text,
    l.public_location_label, l.latitude, l.longitude, l.logo_url,
    l.category_id, l.category_name, l.public_phone, l.public_whatsapp,
    l.opening_hours, l.is_verified, l.verification_status,
    st_distance(
      st_setsrid(st_makepoint(l.longitude, l.latitude), 4326)::geography,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) / 1000.0 as distance_km
  from public.public_business_listings l
  where (p_category_id is null or l.category_id = p_category_id)
    and (p_query is null or p_query = '' or
         l.business_name ilike '%' || p_query || '%' or
         coalesce(l.description, '') ilike '%' || p_query || '%' or
         coalesce(l.category_name, '') ilike '%' || p_query || '%')
    and st_dwithin(
      st_setsrid(st_makepoint(l.longitude, l.latitude), 4326)::geography,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      greatest(p_radius_km, 0.1) * 1000
    )
  order by distance_km asc
  limit least(greatest(p_limit, 1), 200);
$$;

grant execute on function public.nearby_businesses(double precision, double precision, double precision, uuid, text, int)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Customer enquiries: anyone may send; only business members may read.
-- ---------------------------------------------------------------------------
create table if not exists public.business_enquiries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_phone text check (customer_phone is null or char_length(customer_phone) <= 40),
  message text not null check (char_length(message) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.business_enquiries enable row level security;

create policy "enquiries_insert_public"
  on public.business_enquiries for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.is_published
        and b.moderation_status = 'approved'
    )
  );

create policy "enquiries_select_member"
  on public.business_enquiries for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "enquiries_update_member"
  on public.business_enquiries for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- Admin moderation: platform admins may review listings and set status.
-- (has_platform_role exists from Phase 0/1.)
-- ---------------------------------------------------------------------------
create policy "businesses_select_admin"
  on public.businesses for select
  to authenticated
  using (public.has_platform_role('admin'));

create policy "businesses_update_moderation_admin"
  on public.businesses for update
  to authenticated
  using (public.has_platform_role('admin'))
  with check (public.has_platform_role('admin'));

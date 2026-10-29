-- Priced catalogue items go live on For You / Discover as soon as a member saves them.
-- Hide only flagged, suspended, or rejected shops. Map Discover still uses listings+coords.

-- Safe here because feed_event_kind 'impression' was committed in 000021.
create unique index if not exists feed_events_impression_once
  on public.feed_events (profile_id, video_post_id)
  where kind = 'impression' and profile_id is not null;

create or replace function public.ensure_marketplace_listing(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_slug text;
  v_base text;
  v_n integer := 0;
  v_mod public.listing_moderation_status;
begin
  if public.current_profile_id() is not null
     and not public.has_business_capability(p_business_id, 'manage_products')
     and not public.has_platform_role('admin') then
    raise exception 'Not allowed';
  end if;

  select business_name, public_slug, moderation_status
    into v_name, v_slug, v_mod
  from public.businesses
  where id = p_business_id;
  if v_name is null then
    return;
  end if;
  if v_mod in ('flagged', 'suspended') then
    return;
  end if;

  if v_slug is null or length(btrim(v_slug)) = 0 then
    v_base := trim(both '-' from regexp_replace(lower(btrim(v_name)), '[^a-z0-9]+', '-', 'g'));
    if v_base is null or v_base = '' then
      v_base := 'shop';
    end if;
    v_slug := v_base;
    while exists (select 1 from public.businesses where public_slug = v_slug and id <> p_business_id) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n::text;
    end loop;
  end if;

  update public.businesses
  set is_published = true,
      is_informal = true,
      public_slug = v_slug,
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id = p_business_id;
end;
$$;

grant execute on function public.ensure_marketplace_listing(uuid) to authenticated;

create or replace function public.products_publish_to_marketplace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active is true
     and coalesce(new.is_published, true)
     and new.sale_price is not null then
    perform public.ensure_marketplace_listing(new.business_id);
  end if;
  return new;
end;
$$;

drop trigger if exists products_publish_to_marketplace on public.products;
create trigger products_publish_to_marketplace
  after insert or update of sale_price, is_active, is_published, business_id
  on public.products
  for each row execute function public.products_publish_to_marketplace();

create or replace view public.public_business_products as
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
  p.created_at,
  p.updated_at,
  (p.kind = 'service' or p.stock_quantity > 0) as is_available,
  p.stock_quantity,
  b.is_informal,
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
  b.cover_image_url,
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
  and b.public_slug is not null
  and coalesce(b.moderation_status::text, 'pending') not in ('flagged', 'suspended');

grant select on public.public_marketplace_businesses to anon, authenticated;

create or replace function public.add_marketplace_cart_item(
  p_product_id uuid,
  p_quantity numeric default 1,
  p_variant_id text default null
)
returns public.cart_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid := public.current_profile_id();
  v_cart_id uuid;
  v_product public.products%rowtype;
  v_business public.businesses%rowtype;
  v_variant jsonb;
  v_price numeric(18,2);
  v_label text;
  v_item public.cart_items%rowtype;
  v_qty numeric(18,3) := greatest(coalesce(p_quantity, 1), 0.001);
begin
  if v_profile is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_product from public.products where id = p_product_id;
  if v_product.id is null then
    raise exception 'Product not found';
  end if;
  select * into v_business from public.businesses where id = v_product.business_id;
  if v_business.id is null
     or coalesce(v_business.moderation_status::text, 'pending') in ('flagged', 'suspended')
     or v_product.is_active is not true
     or coalesce(v_product.is_published, true) is not true then
    raise exception 'Product is not available on the marketplace';
  end if;
  if v_product.sale_price is null then
    raise exception 'This listing has no price — send an enquiry instead';
  end if;

  v_price := v_product.sale_price;
  v_label := null;
  if p_variant_id is not null then
    select elem into v_variant
    from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) elem
    where elem->>'id' = p_variant_id
    limit 1;
    if v_variant is null then
      raise exception 'Unknown product variant';
    end if;
    v_price := v_price + coalesce((v_variant->>'price_delta')::numeric, 0);
    v_label := nullif(v_variant->>'label', '');
    if v_variant ? 'stock' and (v_variant->>'stock')::numeric < v_qty then
      raise exception 'Insufficient stock for this variant';
    end if;
  elsif v_product.kind = 'goods' and v_product.stock_quantity < v_qty then
    raise exception 'Insufficient stock for %', v_product.name;
  end if;

  select id into v_cart_id from public.carts
  where profile_id = v_profile and status = 'active'
  limit 1;
  if v_cart_id is null then
    begin
      insert into public.carts (profile_id, status)
      values (v_profile, 'active')
      returning id into v_cart_id;
    exception when unique_violation then
      select id into v_cart_id from public.carts
      where profile_id = v_profile and status = 'active'
      limit 1;
    end;
  end if;

  select * into v_item
  from public.cart_items
  where cart_id = v_cart_id
    and product_id = p_product_id
    and coalesce(variant_id, '') = coalesce(p_variant_id, '');

  if v_item.id is not null then
    update public.cart_items
    set quantity = quantity + v_qty,
        unit_price = v_price,
        product_name = v_product.name,
        unit = v_product.unit,
        image_url = v_product.image_url,
        variant_label = v_label
    where id = v_item.id
    returning * into v_item;
    return v_item;
  end if;

  insert into public.cart_items (
    cart_id, business_id, product_id, quantity, unit_price, product_name, unit, image_url, variant_id, variant_label
  ) values (
    v_cart_id, v_product.business_id, p_product_id, v_qty, v_price, v_product.name, v_product.unit, v_product.image_url, p_variant_id, v_label
  ) returning * into v_item;
  return v_item;
end;
$$;

grant execute on function public.add_marketplace_cart_item(uuid, numeric, text) to authenticated;

-- Phase 3: catalogue fields, live-price cart, order requests (no client-side paid),
-- listing reports, buyer enquiry history, notification preferences.

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column if not exists cover_image_url text;

alter table public.products
  add column if not exists description text,
  add column if not exists attributes jsonb not null default '{}'::jsonb,
  add column if not exists variants jsonb not null default '[]'::jsonb,
  add column if not exists extra_image_urls text[] not null default '{}',
  add column if not exists video_url text,
  add column if not exists currency text not null default 'NGN',
  add column if not exists is_published boolean not null default true,
  add column if not exists catalogue_category text;

alter table public.products
  drop constraint if exists products_currency_ok;
alter table public.products
  add constraint products_currency_ok check (currency in ('NGN'));

alter table public.products
  drop constraint if exists products_description_len;
alter table public.products
  add constraint products_description_len check (description is null or char_length(description) <= 4000);

alter table public.products
  drop constraint if exists products_video_url_len;
alter table public.products
  add constraint products_video_url_len check (video_url is null or char_length(video_url) <= 500);

create or replace function public.validate_product_catalogue()
returns trigger
language plpgsql
as $$
begin
  new.name := btrim(new.name);
  if char_length(new.name) < 1 or char_length(new.name) > 120 then
    raise exception 'Product name must be 1–120 characters';
  end if;
  if new.sale_price is not null and new.sale_price < 0 then
    raise exception 'Price cannot be negative';
  end if;
  if jsonb_typeof(coalesce(new.attributes, '{}'::jsonb)) <> 'object' then
    raise exception 'Product attributes must be an object';
  end if;
  if jsonb_typeof(coalesce(new.variants, '[]'::jsonb)) <> 'array' then
    raise exception 'Product variants must be an array';
  end if;
  if not public.is_business_member(new.business_id) and not public.has_platform_role('admin') then
    raise exception 'Only business members can change this catalogue';
  end if;
  return new;
end;
$$;

drop trigger if exists products_validate_catalogue on public.products;
create trigger products_validate_catalogue
  before insert or update on public.products
  for each row execute function public.validate_product_catalogue();

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
  and p.is_published
  and b.is_published
  and b.moderation_status = 'approved'
  and b.is_informal = true;

grant select on public.public_business_products to anon, authenticated;

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

-- ---------------------------------------------------------------------------
-- Cart lines: optional variant
-- ---------------------------------------------------------------------------
alter table public.cart_items
  add column if not exists variant_id text,
  add column if not exists variant_label text;

alter table public.cart_items drop constraint if exists cart_items_cart_id_product_id_key;
create unique index if not exists cart_items_line_uq
  on public.cart_items (cart_id, product_id, coalesce(variant_id, ''));

alter table public.order_items
  add column if not exists variant_id text,
  add column if not exists variant_label text,
  add column if not exists snapshot jsonb not null default '{}'::jsonb;

alter table public.orders
  add column if not exists payment_fee numeric(18, 2) not null default 0,
  add column if not exists is_order_request boolean not null default true,
  add column if not exists idempotency_key text,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb;

create table if not exists public.order_checkout_keys (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  idempotency_key text not null,
  order_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (profile_id, idempotency_key)
);

alter table public.order_checkout_keys enable row level security;
drop policy if exists "checkout_keys_own" on public.order_checkout_keys;
create policy "checkout_keys_own"
  on public.order_checkout_keys for select
  using (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- Reports, notification prefs, buyer enquiries
-- ---------------------------------------------------------------------------
create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  reason text not null check (reason in ('spam', 'scam', 'hate', 'wrong_info', 'other')),
  details text,
  created_at timestamptz not null default now(),
  unique (reporter_id, business_id)
);

alter table public.listing_reports enable row level security;
drop policy if exists "listing_reports_insert_own" on public.listing_reports;
create policy "listing_reports_insert_own"
  on public.listing_reports for insert
  with check (reporter_id = public.current_profile_id());
drop policy if exists "listing_reports_select_own_or_admin" on public.listing_reports;
create policy "listing_reports_select_own_or_admin"
  on public.listing_reports for select
  using (reporter_id = public.current_profile_id() or public.has_platform_role('admin'));

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  order_updates boolean not null default true,
  enquiry_replies boolean not null default true,
  followed_shops boolean not null default true,
  marketing boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
drop policy if exists "notif_prefs_own" on public.notification_preferences;
create policy "notif_prefs_own"
  on public.notification_preferences for all
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

alter table public.business_enquiries
  add column if not exists profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists product_id uuid references public.products (id) on delete set null;

drop policy if exists "enquiries_select_buyer" on public.business_enquiries;
create policy "enquiries_select_buyer"
  on public.business_enquiries for select
  to authenticated
  using (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- Live-price add to cart
-- ---------------------------------------------------------------------------
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
     or v_business.is_published is not true
     or v_business.moderation_status <> 'approved'
     or v_business.is_informal is not true
     or v_product.is_active is not true
     or v_product.is_published is not true then
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

-- ---------------------------------------------------------------------------
-- Checkout quote (live prices)
-- ---------------------------------------------------------------------------
create or replace function public.quote_marketplace_checkout(
  p_fulfilment public.fulfilment_type default 'pickup'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid := public.current_profile_id();
  v_cart public.carts%rowtype;
  v_sellers jsonb := '[]'::jsonb;
  v_biz uuid;
  v_subtotal numeric(18,2);
  v_delivery numeric(18,2);
  v_payment numeric(18,2) := 0;
  v_grand numeric(18,2) := 0;
  v_lines jsonb;
  v_name text;
begin
  if v_profile is null then
    raise exception 'Not authenticated';
  end if;
  select * into v_cart from public.carts where profile_id = v_profile and status = 'active' limit 1;
  if v_cart.id is null then
    return jsonb_build_object(
      'sellers', '[]'::jsonb,
      'subtotal', 0, 'delivery_fee', 0, 'payment_fee', 0, 'total', 0,
      'currency', 'NGN',
      'fulfilment', p_fulfilment,
      'is_order_request', true,
      'payment_ready', false
    );
  end if;

  for v_biz in select distinct business_id from public.cart_items where cart_id = v_cart.id
  loop
    select coalesce(jsonb_agg(jsonb_build_object(
      'product_id', ci.product_id,
      'product_name', p.name,
      'quantity', ci.quantity,
      'unit_price', coalesce(p.sale_price, 0) + coalesce((
        select (elem->>'price_delta')::numeric
        from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) elem
        where elem->>'id' = ci.variant_id
        limit 1
      ), 0),
      'line_total', ci.quantity * (
        coalesce(p.sale_price, 0) + coalesce((
          select (elem->>'price_delta')::numeric
          from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) elem
          where elem->>'id' = ci.variant_id
          limit 1
        ), 0)
      ),
      'available', (p.kind = 'service' or p.stock_quantity >= ci.quantity) and p.is_active and p.is_published,
      'variant_label', ci.variant_label
    )), '[]'::jsonb)
    into v_lines
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart.id and ci.business_id = v_biz;

    select coalesce(sum(
      ci.quantity * (
        coalesce(p.sale_price, 0) + coalesce((
          select (elem->>'price_delta')::numeric
          from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) elem
          where elem->>'id' = ci.variant_id
          limit 1
        ), 0)
      )
    ), 0)
    into v_subtotal
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart.id and ci.business_id = v_biz;

    v_delivery := case when p_fulfilment = 'pickup' then 0 else 500 end;
    select business_name into v_name from public.businesses where id = v_biz;
    v_sellers := v_sellers || jsonb_build_array(jsonb_build_object(
      'business_id', v_biz,
      'business_name', v_name,
      'subtotal', v_subtotal,
      'delivery_fee', v_delivery,
      'payment_fee', v_payment,
      'total', v_subtotal + v_delivery + v_payment,
      'lines', v_lines
    ));
    v_grand := v_grand + v_subtotal + v_delivery + v_payment;
  end loop;

  return jsonb_build_object(
    'sellers', v_sellers,
    'subtotal', (
      select coalesce(sum((s->>'subtotal')::numeric), 0) from jsonb_array_elements(v_sellers) s
    ),
    'delivery_fee', (
      select coalesce(sum((s->>'delivery_fee')::numeric), 0) from jsonb_array_elements(v_sellers) s
    ),
    'payment_fee', 0,
    'total', v_grand,
    'currency', 'NGN',
    'fulfilment', p_fulfilment,
    'is_order_request', true,
    'payment_ready', false
  );
end;
$$;

grant execute on function public.quote_marketplace_checkout(public.fulfilment_type) to authenticated;

-- ---------------------------------------------------------------------------
-- Place order requests — live prices, snapshot, idempotent, never marks paid
-- ---------------------------------------------------------------------------
drop function if exists public.place_marketplace_orders(public.fulfilment_type, uuid, text, text);

create or replace function public.place_marketplace_orders(
  p_fulfilment public.fulfilment_type default 'pickup',
  p_address_id uuid default null,
  p_buyer_note text default null,
  p_buyer_phone text default null,
  p_idempotency_key text default null
)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid := public.current_profile_id();
  v_cart public.carts%rowtype;
  v_biz uuid;
  v_order public.orders%rowtype;
  v_subtotal numeric(18,2);
  v_delivery numeric(18,2);
  v_item record;
  v_price numeric(18,2);
  v_addr jsonb := '{}'::jsonb;
  v_existing uuid[];
begin
  if v_profile is null then
    raise exception 'Not authenticated';
  end if;

  if p_idempotency_key is not null then
    select order_ids into v_existing
    from public.order_checkout_keys
    where profile_id = v_profile and idempotency_key = p_idempotency_key;
    if v_existing is not null then
      return query select * from public.orders where id = any (v_existing);
      return;
    end if;
  end if;

  select * into v_cart from public.carts
  where profile_id = v_profile and status = 'active'
  limit 1;
  if v_cart.id is null then
    raise exception 'Cart is empty';
  end if;

  if p_address_id is not null then
    select to_jsonb(a) into v_addr
    from public.customer_addresses a
    where a.id = p_address_id and a.profile_id = v_profile;
  end if;

  v_existing := '{}';

  for v_biz in
    select distinct business_id from public.cart_items where cart_id = v_cart.id
  loop
    v_subtotal := 0;
    v_delivery := case when p_fulfilment = 'pickup' then 0 else 500 end;

    for v_item in
      select ci.*, p.name as live_name, p.unit as live_unit, p.sale_price, p.kind, p.stock_quantity,
             p.is_active, p.is_published, p.image_url as live_image, p.variants, p.currency, p.attributes
      from public.cart_items ci
      join public.products p on p.id = ci.product_id
      where ci.cart_id = v_cart.id and ci.business_id = v_biz
    loop
      if v_item.is_active is not true or v_item.is_published is not true or v_item.sale_price is null then
        raise exception '% is no longer available', v_item.live_name;
      end if;
      v_price := v_item.sale_price;
      if v_item.variant_id is not null then
        v_price := v_price + coalesce((
          select (elem->>'price_delta')::numeric
          from jsonb_array_elements(coalesce(v_item.variants, '[]'::jsonb)) elem
          where elem->>'id' = v_item.variant_id
          limit 1
        ), 0);
      end if;
      if v_item.kind = 'goods' and v_item.stock_quantity < v_item.quantity then
        raise exception 'Insufficient stock for %', v_item.live_name;
      end if;
      v_subtotal := v_subtotal + (v_item.quantity * v_price);
    end loop;

    insert into public.orders (
      order_number, buyer_profile_id, business_id, status, fulfilment,
      delivery_address_id, delivery_snapshot, subtotal, delivery_fee, payment_fee, total,
      buyer_phone, buyer_note, is_order_request, idempotency_key, pricing_snapshot
    ) values (
      'TJ-' || to_char(now() at time zone 'UTC', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
      v_profile, v_biz, 'pending_payment', p_fulfilment,
      p_address_id, coalesce(v_addr, '{}'::jsonb), v_subtotal, v_delivery, 0, v_subtotal + v_delivery,
      p_buyer_phone, p_buyer_note, true, p_idempotency_key,
      jsonb_build_object('quoted_at', now(), 'fulfilment', p_fulfilment, 'delivery_fee', v_delivery, 'payment_fee', 0)
    ) returning * into v_order;

    insert into public.order_items (
      order_id, product_id, product_name, unit, quantity, unit_price, line_total, image_url, variant_id, variant_label, snapshot
    )
    select
      v_order.id,
      p.id,
      p.name,
      p.unit,
      ci.quantity,
      (p.sale_price + coalesce((
        select (elem->>'price_delta')::numeric
        from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) elem
        where elem->>'id' = ci.variant_id
        limit 1
      ), 0)),
      ci.quantity * (p.sale_price + coalesce((
        select (elem->>'price_delta')::numeric
        from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) elem
        where elem->>'id' = ci.variant_id
        limit 1
      ), 0)),
      p.image_url,
      ci.variant_id,
      ci.variant_label,
      jsonb_build_object(
        'name', p.name,
        'unit_price', p.sale_price,
        'currency', p.currency,
        'attributes', p.attributes,
        'variant_id', ci.variant_id,
        'variant_label', ci.variant_label,
        'image_url', p.image_url
      )
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart.id and ci.business_id = v_biz;

    insert into public.payments (order_id, provider, status, amount, test_mode, metadata)
    values (
      v_order.id, 'test', 'initiated', v_order.total, true,
      jsonb_build_object('kind', 'order_request', 'note', 'No live payment provider configured')
    );

    v_existing := array_append(v_existing, v_order.id);
    return next v_order;
  end loop;

  update public.carts set status = 'converted', updated_at = now() where id = v_cart.id;

  if p_idempotency_key is not null then
    insert into public.order_checkout_keys (profile_id, idempotency_key, order_ids)
    values (v_profile, p_idempotency_key, v_existing)
    on conflict (profile_id, idempotency_key) do nothing;
  end if;
end;
$$;

grant execute on function public.place_marketplace_orders(public.fulfilment_type, uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Authorised status transitions (never paid from the client)
-- ---------------------------------------------------------------------------
create or replace function public.transition_marketplace_order(
  p_order_id uuid,
  p_new_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_profile uuid := public.current_profile_id();
  v_seller boolean;
  v_buyer boolean;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'Order not found';
  end if;
  v_buyer := v_order.buyer_profile_id = v_profile;
  v_seller := public.is_business_member(v_order.business_id);
  if not v_buyer and not v_seller and not public.has_platform_role('admin') then
    raise exception 'Not allowed';
  end if;
  if p_new_status in ('paid', 'refunded') then
    raise exception 'Payment status can only change via a payment provider webhook';
  end if;

  if v_buyer and p_new_status = 'cancelled' and v_order.status in ('pending_payment') then
    update public.orders set status = 'cancelled', updated_at = now() where id = p_order_id returning * into v_order;
    return v_order;
  end if;

  if v_seller then
    if v_order.status = 'pending_payment' and p_new_status = 'confirmed' then
      update public.orders set status = 'confirmed', updated_at = now() where id = p_order_id returning * into v_order;
      return v_order;
    end if;
    if v_order.status = 'confirmed' and p_new_status = 'processing' then
      update public.orders set status = 'processing', updated_at = now() where id = p_order_id returning * into v_order;
      return v_order;
    end if;
    if v_order.status = 'processing' and p_new_status in ('shipped', 'ready_for_pickup') then
      update public.orders set status = p_new_status, updated_at = now() where id = p_order_id returning * into v_order;
      return v_order;
    end if;
    if v_order.status in ('shipped', 'ready_for_pickup', 'processing') and p_new_status = 'delivered' then
      update public.orders set status = 'delivered', updated_at = now() where id = p_order_id returning * into v_order;
      return v_order;
    end if;
    if v_order.status in ('pending_payment', 'confirmed') and p_new_status = 'cancelled' then
      update public.orders set status = 'cancelled', updated_at = now() where id = p_order_id returning * into v_order;
      return v_order;
    end if;
  end if;

  raise exception 'Invalid status transition from % to %', v_order.status, p_new_status;
end;
$$;

grant execute on function public.transition_marketplace_order(uuid, public.order_status) to authenticated;

-- Test payment stays available for development only; it is not called from checkout.
create or replace function public.complete_test_payment(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Live card payment is not configured. Orders stay as requests until Paystack or Flutterwave webhooks are connected.';
end;
$$;

grant execute on function public.complete_test_payment(uuid) to authenticated;

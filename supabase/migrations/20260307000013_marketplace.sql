-- TIJAR Marketplace: customer mode, cart, orders, addresses, favorites, payments, business upgrade requests.

create type public.account_mode as enum ('customer', 'business', 'both');
create type public.active_mode as enum ('customer', 'business');
create type public.cart_status as enum ('active', 'converted', 'abandoned');
create type public.order_status as enum (
  'pending_payment', 'paid', 'confirmed', 'processing', 'shipped',
  'ready_for_pickup', 'delivered', 'cancelled', 'refunded'
);
create type public.fulfilment_type as enum ('pickup', 'seller_delivery', 'third_party');
create type public.payment_provider as enum ('test', 'paystack', 'flutterwave');
create type public.payment_status as enum ('initiated', 'pending', 'success', 'failed', 'cancelled', 'refunded');
create type public.upgrade_request_status as enum ('pending', 'approved', 'rejected');

alter table public.profiles
  add column if not exists account_mode public.account_mode not null default 'business',
  add column if not exists active_mode public.active_mode not null default 'business';

-- Buyers skip merchant onboarding; treat customer-only as "completed" for RequireAuth gates.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_account public.account_mode;
  v_active public.active_mode;
  v_onboarding public.onboarding_status;
begin
  v_mode := coalesce(new.raw_user_meta_data ->> 'account_mode', 'business');
  if v_mode = 'customer' then
    v_account := 'customer';
    v_active := 'customer';
    v_onboarding := 'completed';
  else
    v_account := 'business';
    v_active := 'business';
    v_onboarding := 'not_started';
  end if;

  insert into public.profiles (
    auth_id, email, full_name, phone, account_mode, active_mode, onboarding_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    v_account,
    v_active,
    v_onboarding
  );
  return new;
end;
$$;

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  state text not null,
  city text not null,
  lga text,
  street text not null,
  instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_profile_idx on public.customer_addresses (profile_id);

create table if not exists public.marketplace_favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint marketplace_favorites_target check (
    (product_id is not null and business_id is null)
    or (business_id is not null and product_id is null)
  )
);

create unique index if not exists marketplace_favorites_product_uq
  on public.marketplace_favorites (profile_id, product_id) where product_id is not null;
create unique index if not exists marketplace_favorites_business_uq
  on public.marketplace_favorites (profile_id, business_id) where business_id is not null;

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.cart_status not null default 'active',
  updated_at timestamptz not null default now()
);

create unique index if not exists carts_one_active_per_profile
  on public.carts (profile_id) where status = 'active';

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity numeric(18, 3) not null check (quantity > 0),
  unit_price numeric(18, 2) not null check (unit_price >= 0),
  product_name text not null,
  unit text not null default 'piece',
  image_url text,
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_profile_id uuid not null references public.profiles (id) on delete restrict,
  business_id uuid not null references public.businesses (id) on delete restrict,
  status public.order_status not null default 'pending_payment',
  fulfilment public.fulfilment_type not null default 'pickup',
  delivery_address_id uuid references public.customer_addresses (id) on delete set null,
  delivery_snapshot jsonb not null default '{}'::jsonb,
  subtotal numeric(18, 2) not null,
  delivery_fee numeric(18, 2) not null default 0,
  total numeric(18, 2) not null,
  currency text not null default 'NGN',
  buyer_phone text,
  buyer_note text,
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_buyer_idx on public.orders (buyer_profile_id, created_at desc);
create index if not exists orders_business_idx on public.orders (business_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  unit text not null,
  quantity numeric(18, 3) not null,
  unit_price numeric(18, 2) not null,
  line_total numeric(18, 2) not null,
  image_url text
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider public.payment_provider not null default 'test',
  status public.payment_status not null default 'initiated',
  amount numeric(18, 2) not null,
  currency text not null default 'NGN',
  provider_reference text,
  test_mode boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  business_name text not null,
  location text,
  phone text,
  note text,
  status public.upgrade_request_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists business_upgrade_requests_status_idx
  on public.business_upgrade_requests (status, created_at desc);

-- RLS
alter table public.customer_addresses enable row level security;
alter table public.marketplace_favorites enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.business_upgrade_requests enable row level security;

create policy "addresses_own_all"
  on public.customer_addresses for all
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create policy "favorites_own_all"
  on public.marketplace_favorites for all
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create policy "carts_own_all"
  on public.carts for all
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create policy "cart_items_own"
  on public.cart_items for all
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.profile_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.profile_id = public.current_profile_id()
    )
  );

create policy "orders_buyer_select"
  on public.orders for select
  using (buyer_profile_id = public.current_profile_id() or public.is_business_member(business_id));

create policy "orders_buyer_insert"
  on public.orders for insert
  with check (buyer_profile_id = public.current_profile_id());

create policy "orders_seller_update"
  on public.orders for update
  using (
    buyer_profile_id = public.current_profile_id()
    or public.is_business_member(business_id)
  );

create policy "order_items_select"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_profile_id = public.current_profile_id() or public.is_business_member(o.business_id))
    )
  );

create policy "order_items_insert_buyer"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_profile_id = public.current_profile_id()
    )
  );

create policy "payments_select"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_profile_id = public.current_profile_id() or public.is_business_member(o.business_id))
    )
  );

create policy "payments_insert_buyer"
  on public.payments for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_profile_id = public.current_profile_id()
    )
  );

create policy "payments_update_buyer"
  on public.payments for update
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_profile_id = public.current_profile_id()
    )
  );

create policy "upgrade_own_select_insert"
  on public.business_upgrade_requests for select
  using (profile_id = public.current_profile_id() or public.has_platform_role('admin'));

create policy "upgrade_own_insert"
  on public.business_upgrade_requests for insert
  with check (profile_id = public.current_profile_id());

create policy "upgrade_admin_update"
  on public.business_upgrade_requests for update
  using (public.has_platform_role('admin'));

-- Place order RPC: creates one order per seller from active cart, reserves nothing yet (paid → stock later).
create or replace function public.place_marketplace_orders(
  p_fulfilment public.fulfilment_type default 'pickup',
  p_address_id uuid default null,
  p_buyer_note text default null,
  p_buyer_phone text default null
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
  v_item record;
  v_stock numeric(18,3);
begin
  if v_profile is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_cart from public.carts
  where profile_id = v_profile and status = 'active'
  limit 1;

  if v_cart.id is null then
    raise exception 'Cart is empty';
  end if;

  for v_biz in
    select distinct business_id from public.cart_items where cart_id = v_cart.id
  loop
    select coalesce(sum(quantity * unit_price), 0) into v_subtotal
    from public.cart_items where cart_id = v_cart.id and business_id = v_biz;

    -- stock check
    for v_item in
      select * from public.cart_items where cart_id = v_cart.id and business_id = v_biz
    loop
      select stock_quantity into v_stock from public.products where id = v_item.product_id;
      if v_stock is not null and v_stock < v_item.quantity then
        raise exception 'Insufficient stock for %', v_item.product_name;
      end if;
    end loop;

    insert into public.orders (
      order_number, buyer_profile_id, business_id, status, fulfilment,
      delivery_address_id, subtotal, delivery_fee, total, buyer_phone, buyer_note
    ) values (
      'TJ-' || to_char(now() at time zone 'UTC', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
      v_profile, v_biz, 'pending_payment', p_fulfilment,
      p_address_id, v_subtotal, 0, v_subtotal, p_buyer_phone, p_buyer_note
    ) returning * into v_order;

    insert into public.order_items (order_id, product_id, product_name, unit, quantity, unit_price, line_total, image_url)
    select v_order.id, product_id, product_name, unit, quantity, unit_price, quantity * unit_price, image_url
    from public.cart_items
    where cart_id = v_cart.id and business_id = v_biz;

    insert into public.payments (order_id, provider, status, amount, test_mode)
    values (v_order.id, 'test', 'initiated', v_order.total, true);

    return next v_order;
  end loop;

  update public.carts set status = 'converted', updated_at = now() where id = v_cart.id;
end;
$$;

grant execute on function public.place_marketplace_orders(public.fulfilment_type, uuid, text, text) to authenticated;

-- Test payment completion (development / when Paystack not configured)
create or replace function public.complete_test_payment(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  select * into v_order from public.orders
  where id = p_order_id and buyer_profile_id = public.current_profile_id();

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  update public.payments
  set status = 'success', provider_reference = 'TEST-' || p_order_id::text, updated_at = now()
  where order_id = p_order_id;

  update public.orders set status = 'paid', updated_at = now()
  where id = p_order_id
  returning * into v_order;

  -- Deduct stock for goods (best-effort; services skipped)
  for v_item in
    select oi.* from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id and p.kind = 'goods'
  loop
    begin
      insert into public.stock_movements (business_id, product_id, quantity_delta, reason, notes, created_by)
      values (
        v_order.business_id,
        v_item.product_id,
        -v_item.quantity,
        'sale',
        'Marketplace order ' || v_order.order_number,
        null
      );
    exception when others then
      null;
    end;
  end loop;

  return v_order;
end;
$$;

grant execute on function public.complete_test_payment(uuid) to authenticated;

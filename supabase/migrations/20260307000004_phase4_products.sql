-- Phase 4: products + stock movements

create type public.stock_movement_reason as enum (
  'initial',
  'purchase',
  'sale',
  'adjustment',
  'return'
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  unit text not null default 'piece',
  sale_price numeric(18, 2),
  cost_price numeric(18, 2),
  stock_quantity numeric(18, 3) not null default 0,
  low_stock_threshold numeric(18, 3) not null default 5,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_empty check (char_length(trim(name)) > 0),
  constraint products_stock_non_negative check (stock_quantity >= 0)
);

create index products_business_idx on public.products (business_id, name);
create index products_business_active_idx on public.products (business_id) where is_active = true;

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity_delta numeric(18, 3) not null,
  reason public.stock_movement_reason not null,
  transaction_id uuid references public.transactions (id) on delete set null,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_movements_delta_nonzero check (quantity_delta <> 0)
);

create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create or replace function public.stock_movements_before_insert()
returns trigger
language plpgsql
as $$
declare
  current_qty numeric(18, 3);
begin
  if not exists (
    select 1 from public.products p
    where p.id = new.product_id and p.business_id = new.business_id
  ) then
    raise exception 'product does not belong to this business';
  end if;

  select stock_quantity into current_qty from public.products where id = new.product_id;
  if current_qty + new.quantity_delta < 0 then
    raise exception 'insufficient stock for this movement';
  end if;

  return new;
end;
$$;

create trigger stock_movements_before_insert
  before insert on public.stock_movements
  for each row execute function public.stock_movements_before_insert();

create or replace function public.stock_movements_apply()
returns trigger
language plpgsql
as $$
begin
  update public.products
  set stock_quantity = stock_quantity + new.quantity_delta,
      updated_at = now()
  where id = new.product_id;
  return new;
end;
$$;

create trigger stock_movements_apply
  after insert on public.stock_movements
  for each row execute function public.stock_movements_apply();

alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

create policy "products_select_member"
  on public.products for select
  using (public.is_business_member(business_id));

create policy "products_insert_member"
  on public.products for insert
  with check (public.is_business_member(business_id));

create policy "products_update_member"
  on public.products for update
  using (public.is_business_member(business_id));

create policy "products_delete_member"
  on public.products for delete
  using (public.is_business_member(business_id));

create policy "stock_movements_select_member"
  on public.stock_movements for select
  using (public.is_business_member(business_id));

create policy "stock_movements_insert_member"
  on public.stock_movements for insert
  with check (
    public.is_business_member(business_id)
    and (created_by is null or created_by = public.current_profile_id())
  );

-- Phase 2: customers, suppliers, transactions + RLS + balance triggers

create type public.transaction_type as enum (
  'sale',
  'expense',
  'purchase',
  'customer_payment',
  'supplier_payment'
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  balance_owed numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_name_not_empty check (char_length(trim(name)) > 0)
);

create index customers_business_idx on public.customers (business_id, name);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  balance_owed numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_name_not_empty check (char_length(trim(name)) > 0)
);

create index suppliers_business_idx on public.suppliers (business_id, name);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(18, 2) not null,
  currency text not null default 'NGN',
  payment_method text,
  description text,
  customer_id uuid references public.customers (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint transactions_amount_positive check (amount > 0)
);

create index transactions_business_occurred_idx
  on public.transactions (business_id, occurred_at desc);

create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- Validate party belongs to business; apply credit balances after insert
create or replace function public.transactions_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.customer_id is not null then
    if not exists (
      select 1 from public.customers c
      where c.id = new.customer_id and c.business_id = new.business_id
    ) then
      raise exception 'customer does not belong to this business';
    end if;
  end if;

  if new.supplier_id is not null then
    if not exists (
      select 1 from public.suppliers s
      where s.id = new.supplier_id and s.business_id = new.business_id
    ) then
      raise exception 'supplier does not belong to this business';
    end if;
  end if;

  return new;
end;
$$;

create trigger transactions_before_insert
  before insert on public.transactions
  for each row execute function public.transactions_before_insert();

create or replace function public.transactions_apply_balances()
returns trigger
language plpgsql
as $$
begin
  if new.customer_id is not null then
    if new.type = 'sale' and new.payment_method = 'credit' then
      update public.customers
      set balance_owed = balance_owed + new.amount, updated_at = now()
      where id = new.customer_id;
    elsif new.type = 'customer_payment' then
      update public.customers
      set balance_owed = balance_owed - new.amount, updated_at = now()
      where id = new.customer_id;
    end if;
  end if;

  if new.supplier_id is not null then
    if new.type = 'purchase' and new.payment_method = 'credit' then
      update public.suppliers
      set balance_owed = balance_owed + new.amount, updated_at = now()
      where id = new.supplier_id;
    elsif new.type = 'supplier_payment' then
      update public.suppliers
      set balance_owed = balance_owed - new.amount, updated_at = now()
      where id = new.supplier_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger transactions_apply_balances
  after insert on public.transactions
  for each row execute function public.transactions_apply_balances();

alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.transactions enable row level security;

create policy "customers_select_member"
  on public.customers for select
  using (public.is_business_member(business_id));

create policy "customers_insert_member"
  on public.customers for insert
  with check (public.is_business_member(business_id));

create policy "customers_update_member"
  on public.customers for update
  using (public.is_business_member(business_id));

create policy "customers_delete_member"
  on public.customers for delete
  using (public.is_business_member(business_id));

create policy "suppliers_select_member"
  on public.suppliers for select
  using (public.is_business_member(business_id));

create policy "suppliers_insert_member"
  on public.suppliers for insert
  with check (public.is_business_member(business_id));

create policy "suppliers_update_member"
  on public.suppliers for update
  using (public.is_business_member(business_id));

create policy "suppliers_delete_member"
  on public.suppliers for delete
  using (public.is_business_member(business_id));

create policy "transactions_select_member"
  on public.transactions for select
  using (public.is_business_member(business_id));

create policy "transactions_insert_member"
  on public.transactions for insert
  with check (
    public.is_business_member(business_id)
    and (created_by is null or created_by = public.current_profile_id())
  );

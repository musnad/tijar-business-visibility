-- Seller bank details, Flutterwave wallet, payout requests.

alter table public.businesses
  add column if not exists payout_account_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_bank_code text;

alter table public.orders
  add column if not exists payment_method text,
  add column if not exists payment_destination text;

create table if not exists public.seller_wallets (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  available_ngn numeric(18, 2) not null default 0 check (available_ngn >= 0),
  pending_ngn numeric(18, 2) not null default 0 check (pending_ngn >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  amount_ngn numeric(18, 2) not null check (amount_ngn > 0),
  status text not null default 'pending',
  provider_reference text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payout_requests_business_idx
  on public.payout_requests (business_id, created_at desc);

alter table public.seller_wallets enable row level security;
alter table public.payout_requests enable row level security;

drop policy if exists "seller_wallets_member_read" on public.seller_wallets;
drop policy if exists "payout_requests_member_read" on public.payout_requests;
drop policy if exists "payout_requests_member_insert" on public.payout_requests;

create policy "seller_wallets_member_read"
  on public.seller_wallets for select
  using (public.is_business_member(business_id));

create policy "payout_requests_member_read"
  on public.payout_requests for select
  using (public.is_business_member(business_id));

create policy "payout_requests_member_insert"
  on public.payout_requests for insert
  with check (public.is_business_member(business_id));

create or replace view public.public_business_payout_accounts as
select
  id as business_id,
  business_name,
  payout_account_name,
  payout_account_number,
  payout_bank_name,
  payout_bank_code
from public.businesses
where payout_account_number is not null
  and length(trim(payout_account_number)) >= 8;

grant select on public.public_business_payout_accounts to anon, authenticated;

create or replace function public.credit_seller_wallet(p_business_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.seller_wallets (business_id, available_ngn, updated_at)
  values (p_business_id, greatest(p_amount, 0), now())
  on conflict (business_id) do update
    set available_ngn = public.seller_wallets.available_ngn + greatest(p_amount, 0),
        updated_at = now();
end;
$$;

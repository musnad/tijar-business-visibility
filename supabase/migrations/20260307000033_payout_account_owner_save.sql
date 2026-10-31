-- Owners can save a transfer account even without a business_members row.
-- Buyers can read that account for checkout.

alter table public.businesses
  add column if not exists payout_account_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_bank_code text;

drop policy if exists businesses_update_member on public.businesses;
create policy businesses_update_member
  on public.businesses for update
  using (
    public.is_business_member(id)
    or owner_id = public.current_profile_id()
  )
  with check (
    public.is_business_member(id)
    or owner_id = public.current_profile_id()
  );

create or replace function public.save_business_payout_account(
  p_business_id uuid,
  p_account_name text,
  p_account_number text,
  p_bank_name text,
  p_bank_code text
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.businesses%rowtype;
  v_profile uuid := public.current_profile_id();
  v_number text := regexp_replace(coalesce(p_account_number, ''), '\s+', '', 'g');
  v_owner boolean := false;
begin
  if v_profile is null then
    raise exception 'Sign in to save a bank account';
  end if;

  select exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_id = v_profile
  ) into v_owner;

  if not v_owner and not public.is_business_member(p_business_id) and not public.has_platform_role('admin') then
    raise exception 'Not allowed';
  end if;

  if char_length(trim(coalesce(p_account_name, ''))) < 2 then
    raise exception 'Enter the account name';
  end if;
  if char_length(v_number) < 8 or char_length(v_number) > 12 then
    raise exception 'Enter a valid account number';
  end if;
  if v_number !~ '^[0-9]+$' then
    raise exception 'Account number must be digits only';
  end if;

  insert into public.business_members (business_id, profile_id, role)
  values (p_business_id, v_profile, 'owner')
  on conflict (business_id, profile_id) do nothing;

  update public.businesses
  set
    payout_account_name = trim(p_account_name),
    payout_account_number = v_number,
    payout_bank_name = nullif(trim(p_bank_name), ''),
    payout_bank_code = nullif(trim(p_bank_code), ''),
    updated_at = now()
  where id = p_business_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Business not found';
  end if;
  return v_row;
end;
$$;

grant execute on function public.save_business_payout_account(uuid, text, text, text, text) to authenticated;

create or replace function public.get_business_payout_account(p_business_id uuid)
returns table (
  business_id uuid,
  business_name text,
  payout_account_name text,
  payout_account_number text,
  payout_bank_name text,
  payout_bank_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.business_name,
    b.payout_account_name,
    b.payout_account_number,
    b.payout_bank_name,
    b.payout_bank_code
  from public.businesses b
  where b.id = p_business_id
    and b.payout_account_number is not null
    and length(trim(b.payout_account_number)) >= 8
  limit 1;
$$;

grant execute on function public.get_business_payout_account(uuid) to anon, authenticated;

drop view if exists public.public_business_payout_accounts;

create view public.public_business_payout_accounts as
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

do $$
begin
  alter view public.public_business_payout_accounts set (security_invoker = false);
exception
  when others then null;
end $$;

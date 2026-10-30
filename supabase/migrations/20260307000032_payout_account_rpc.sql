-- Bank account save that members can call even if PostgREST schema lags.

alter table public.businesses
  add column if not exists payout_account_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_bank_code text;

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
  v_number text := regexp_replace(coalesce(p_account_number, ''), '\s+', '', 'g');
begin
  if not public.is_business_member(p_business_id) and not public.has_platform_role('admin') then
    raise exception 'Not allowed';
  end if;
  if char_length(trim(coalesce(p_account_name, ''))) < 2 then
    raise exception 'Enter the account name';
  end if;
  if char_length(v_number) < 8 then
    raise exception 'Enter a valid account number';
  end if;

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

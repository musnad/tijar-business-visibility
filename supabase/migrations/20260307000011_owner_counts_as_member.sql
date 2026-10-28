-- Owners could open /app/products/new (businesses select allows owner_id)
-- but products_insert_member only checked business_members — so add product failed
-- with RLS for anyone missing a membership row (or after a partial onboarding).

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.profile_id = public.current_profile_id()
  )
  or exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = public.current_profile_id()
  );
$$;

-- Backfill missing owner membership rows (idempotent).
insert into public.business_members (business_id, profile_id, role)
select b.id, b.owner_id, 'owner'::public.business_member_role
from public.businesses b
where b.owner_id is not null
  and not exists (
    select 1
    from public.business_members bm
    where bm.business_id = b.id
      and bm.profile_id = b.owner_id
  );

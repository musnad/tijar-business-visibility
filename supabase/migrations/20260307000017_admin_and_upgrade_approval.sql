-- Seed TIJAR super-admin and let admins approve customer→business upgrades.

create or replace function public.grant_tijar_super_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.profiles
  where lower(email) = 'musababubakar123@gmail.com'
  limit 1;

  if v_id is null then
    return;
  end if;

  insert into public.platform_roles (profile_id, role)
  values (v_id, 'admin')
  on conflict (profile_id, role) do nothing;
end;
$$;

create or replace function public.profiles_grant_admin_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'musababubakar123@gmail.com' then
    insert into public.platform_roles (profile_id, role)
    values (new.id, 'admin')
    on conflict (profile_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_grant_tijar_admin on public.profiles;
create trigger profiles_grant_tijar_admin
  after insert or update of email on public.profiles
  for each row
  execute function public.profiles_grant_admin_trigger();

select public.grant_tijar_super_admin();

-- Logged-in super-admin can claim the role if the profile existed before this migration.
create or replace function public.claim_tijar_super_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.current_profile_id();
  v_email text;
begin
  if v_id is null then
    return false;
  end if;
  select lower(email) into v_email from public.profiles where id = v_id;
  if v_email is distinct from 'musababubakar123@gmail.com' then
    return false;
  end if;
  insert into public.platform_roles (profile_id, role)
  values (v_id, 'admin')
  on conflict (profile_id, role) do nothing;
  return true;
end;
$$;

grant execute on function public.claim_tijar_super_admin() to authenticated;
grant execute on function public.grant_tijar_super_admin() to authenticated;

-- Admin can see all profiles (console).
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.has_platform_role('admin'));

drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin"
  on public.orders for select
  using (public.has_platform_role('admin'));

drop policy if exists "order_items_select_admin" on public.order_items;
create policy "order_items_select_admin"
  on public.order_items for select
  using (public.has_platform_role('admin'));

drop policy if exists "products_select_admin" on public.products;
create policy "products_select_admin"
  on public.products for select
  using (public.has_platform_role('admin'));

-- Approve/reject customer business applications and open dashboard access.
create or replace function public.review_business_upgrade(
  p_request_id uuid,
  p_approve boolean,
  p_notes text default null
)
returns public.business_upgrade_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.business_upgrade_requests%rowtype;
  v_business_id uuid;
begin
  if not public.has_platform_role('admin') then
    raise exception 'Admins only';
  end if;

  select * into v_req from public.business_upgrade_requests where id = p_request_id;
  if v_req.id is null then
    raise exception 'Request not found';
  end if;

  if p_approve then
    update public.profiles
    set account_mode = case
          when account_mode = 'customer' then 'both'::public.account_mode
          else account_mode
        end,
        active_mode = 'business',
        onboarding_status = 'completed'
    where id = v_req.profile_id;

    select id into v_business_id
    from public.businesses
    where owner_id = v_req.profile_id
    limit 1;

    if v_business_id is null then
      insert into public.businesses (
        owner_id, business_name, category_id, description, location, logo_url,
        public_phone, public_whatsapp, latitude, longitude, public_location_label,
        is_informal, is_published, moderation_status, location_approved
      )
      values (
        v_req.profile_id,
        v_req.business_name,
        v_req.category_id,
        v_req.description,
        coalesce(v_req.location, concat_ws(', ', v_req.street, v_req.city, v_req.state)),
        v_req.shop_image_url,
        v_req.phone,
        v_req.whatsapp,
        v_req.latitude,
        v_req.longitude,
        v_req.public_location_label,
        true,
        true,
        'pending',
        v_req.latitude is not null
      )
      returning id into v_business_id;

      insert into public.business_members (business_id, profile_id, role)
      values (v_business_id, v_req.profile_id, 'owner')
      on conflict do nothing;
    end if;

    update public.business_upgrade_requests
    set
      status = 'approved',
      note = coalesce(p_notes, note),
      reviewed_by = public.current_profile_id(),
      reviewed_at = now()
    where id = p_request_id
    returning * into v_req;
  else
    update public.business_upgrade_requests
    set
      status = 'rejected',
      note = coalesce(p_notes, note),
      reviewed_by = public.current_profile_id(),
      reviewed_at = now()
    where id = p_request_id
    returning * into v_req;
  end if;

  return v_req;
end;
$$;

grant execute on function public.review_business_upgrade(uuid, boolean, text) to authenticated;

-- One-click approve every pending shop, and keep user/shop phone numbers on record.

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
  v_phone text;
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

  v_phone := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', new.phone, '')), '');

  insert into public.profiles (
    auth_id, email, full_name, phone, account_mode, active_mode, onboarding_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_phone,
    v_account,
    v_active,
    v_onboarding
  );
  return new;
end;
$$;

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
  v_phone text;
begin
  if not public.has_platform_role('admin') then
    raise exception 'Admins only';
  end if;

  select * into v_req from public.business_upgrade_requests where id = p_request_id;
  if v_req.id is null then
    raise exception 'Request not found';
  end if;

  v_phone := nullif(btrim(coalesce(v_req.phone, v_req.whatsapp, '')), '');

  if p_approve then
    update public.profiles
    set
      account_mode = case
        when account_mode = 'customer' then 'both'::public.account_mode
        else account_mode
      end,
      active_mode = 'business',
      onboarding_status = 'completed',
      phone = coalesce(nullif(btrim(coalesce(phone, '')), ''), v_phone)
    where id = v_req.profile_id;

    select id into v_business_id
    from public.businesses
    where owner_id = v_req.profile_id
    limit 1;

    if v_business_id is null then
      insert into public.businesses (
        owner_id, business_name, category_id, description, location, logo_url,
        public_phone, public_whatsapp, latitude, longitude, public_location_label,
        is_informal, is_published, moderation_status, location_approved, verification_status,
        published_at
      )
      values (
        v_req.profile_id,
        v_req.business_name,
        v_req.category_id,
        v_req.description,
        coalesce(v_req.location, concat_ws(', ', v_req.street, v_req.city, v_req.state)),
        v_req.shop_image_url,
        v_phone,
        coalesce(nullif(btrim(coalesce(v_req.whatsapp, '')), ''), v_phone),
        v_req.latitude,
        v_req.longitude,
        v_req.public_location_label,
        true,
        true,
        'approved',
        v_req.latitude is not null,
        'verified',
        now()
      )
      returning id into v_business_id;

      insert into public.business_members (business_id, profile_id, role)
      values (v_business_id, v_req.profile_id, 'owner')
      on conflict do nothing;
    else
      update public.businesses
      set
        verification_status = 'verified',
        moderation_status = 'approved',
        is_published = true,
        published_at = coalesce(published_at, now()),
        location_approved = true,
        public_phone = coalesce(nullif(btrim(coalesce(public_phone, '')), ''), v_phone),
        public_whatsapp = coalesce(nullif(btrim(coalesce(public_whatsapp, '')), ''), v_req.whatsapp, v_phone)
      where id = v_business_id;
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

create or replace function public.admin_approve_all_businesses()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apps int := 0;
  v_shops int := 0;
  v_req record;
begin
  if not public.has_platform_role('admin') then
    raise exception 'Admins only';
  end if;

  for v_req in
    select id from public.business_upgrade_requests where status = 'pending'
  loop
    perform public.review_business_upgrade(v_req.id, true, 'Approved in bulk');
    v_apps := v_apps + 1;
  end loop;

  update public.profiles p
  set phone = nullif(btrim(r.phone), '')
  from public.business_upgrade_requests r
  where r.profile_id = p.id
    and (p.phone is null or btrim(p.phone) = '')
    and r.phone is not null and btrim(r.phone) <> '';

  update public.businesses b
  set
    verification_status = 'verified',
    moderation_status = 'approved',
    is_published = true,
    published_at = coalesce(b.published_at, now()),
    location_approved = true,
    public_phone = coalesce(
      nullif(btrim(coalesce(b.public_phone, '')), ''),
      nullif(btrim(coalesce(p.phone, '')), '')
    ),
    public_whatsapp = coalesce(
      nullif(btrim(coalesce(b.public_whatsapp, '')), ''),
      nullif(btrim(coalesce(b.public_phone, '')), ''),
      nullif(btrim(coalesce(p.phone, '')), '')
    )
  from public.profiles p
  where p.id = b.owner_id
    and coalesce(b.moderation_status, 'pending') is distinct from 'suspended';

  get diagnostics v_shops = row_count;

  update public.profiles p
  set phone = nullif(btrim(b.public_phone), '')
  from public.businesses b
  where b.owner_id = p.id
    and (p.phone is null or btrim(p.phone) = '')
    and b.public_phone is not null and btrim(b.public_phone) <> '';

  return jsonb_build_object('applications', v_apps, 'shops', v_shops);
end;
$$;

grant execute on function public.review_business_upgrade(uuid, boolean, text) to authenticated;
grant execute on function public.admin_approve_all_businesses() to authenticated;

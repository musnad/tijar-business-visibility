-- Shop owners can edit their business even without a members row.

alter table public.businesses
  add column if not exists public_phone text,
  add column if not exists public_whatsapp text,
  add column if not exists logo_url text,
  add column if not exists description text,
  add column if not exists location text;

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

create or replace function public.save_business_profile(
  p_business_id uuid,
  p_business_name text,
  p_location text,
  p_description text,
  p_category_id uuid,
  p_islamic_mode boolean,
  p_logo_url text,
  p_clear_logo boolean,
  p_public_phone text,
  p_public_whatsapp text
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.businesses%rowtype;
  v_profile uuid := public.current_profile_id();
  v_owner boolean := false;
  v_name text := trim(coalesce(p_business_name, ''));
begin
  if v_profile is null then
    raise exception 'Sign in to edit this shop';
  end if;

  select exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_id = v_profile
  ) into v_owner;

  if not v_owner and not public.is_business_member(p_business_id) and not public.has_platform_role('admin') then
    raise exception 'Not allowed';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'Enter your business name';
  end if;

  insert into public.business_members (business_id, profile_id, role)
  values (p_business_id, v_profile, 'owner')
  on conflict (business_id, profile_id) do nothing;

  update public.businesses
  set
    business_name = v_name,
    location = nullif(trim(coalesce(p_location, '')), ''),
    description = nullif(trim(coalesce(p_description, '')), ''),
    category_id = p_category_id,
    islamic_mode_enabled = coalesce(p_islamic_mode, islamic_mode_enabled),
    logo_url = case
      when p_clear_logo then null
      when p_logo_url is not null and length(trim(p_logo_url)) > 0 then trim(p_logo_url)
      else logo_url
    end,
    public_phone = nullif(trim(coalesce(p_public_phone, '')), ''),
    public_whatsapp = nullif(trim(coalesce(p_public_whatsapp, '')), ''),
    updated_at = now()
  where id = p_business_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Business not found';
  end if;
  return v_row;
end;
$$;

grant execute on function public.save_business_profile(uuid, text, text, text, uuid, boolean, text, boolean, text, text) to authenticated;

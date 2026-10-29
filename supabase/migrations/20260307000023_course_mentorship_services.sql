-- Course / mentorship services, enrolments, customer email, file-import friendly contacts.

alter table public.products
  add column if not exists service_type text not null default 'general',
  add column if not exists starts_on date,
  add column if not exists ends_on date;

alter table public.products
  drop constraint if exists products_service_type_ok;
alter table public.products
  add constraint products_service_type_ok
  check (service_type in ('general', 'course', 'mentorship'));

alter table public.products
  drop constraint if exists products_service_dates_ok;
alter table public.products
  add constraint products_service_dates_ok
  check (starts_on is null or ends_on is null or ends_on >= starts_on);

alter table public.customers
  add column if not exists email text;

create table if not exists public.service_enrollments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  status text not null default 'requested',
  notes text,
  created_at timestamptz not null default now(),
  constraint enrollments_name_ok check (char_length(trim(full_name)) >= 2),
  constraint enrollments_status_ok check (status in ('requested', 'confirmed', 'cancelled', 'completed')),
  constraint enrollments_contact_ok check (email is not null or phone is not null)
);

create index if not exists service_enrollments_business_idx
  on public.service_enrollments (business_id, created_at desc);
create index if not exists service_enrollments_product_idx
  on public.service_enrollments (product_id);

alter table public.service_enrollments enable row level security;

drop policy if exists "enrollments_member_select" on public.service_enrollments;
create policy "enrollments_member_select"
  on public.service_enrollments for select
  using (public.is_business_member(business_id));

drop policy if exists "enrollments_member_update" on public.service_enrollments;
create policy "enrollments_member_update"
  on public.service_enrollments for update
  using (public.is_business_member(business_id));

drop policy if exists "enrollments_insert_public" on public.service_enrollments;
create policy "enrollments_insert_public"
  on public.service_enrollments for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and p.business_id = service_enrollments.business_id
        and p.kind = 'service'
        and p.is_active
        and coalesce(p.is_published, true)
    )
  );

create or replace function public.enroll_in_service(
  p_product_id uuid,
  p_full_name text,
  p_email text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_customer uuid;
  v_id uuid;
  v_name text := btrim(p_full_name);
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  if char_length(v_name) < 2 then
    raise exception 'Enter your name';
  end if;
  if v_email is null and v_phone is null then
    raise exception 'Add an email or phone number';
  end if;

  select * into v_product from public.products where id = p_product_id;
  if v_product.id is null or v_product.kind <> 'service' or v_product.is_active is not true then
    raise exception 'This service is not available';
  end if;
  if coalesce(v_product.is_published, true) is not true or v_product.sale_price is null then
    raise exception 'This service is not open for enrolment';
  end if;

  if v_email is not null then
    select id into v_customer
    from public.customers
    where business_id = v_product.business_id and lower(coalesce(email, '')) = v_email
    limit 1;
  end if;
  if v_customer is null and v_phone is not null then
    select id into v_customer
    from public.customers
    where business_id = v_product.business_id and phone = v_phone
    limit 1;
  end if;

  if v_customer is null then
    insert into public.customers (business_id, name, phone, email, notes)
    values (v_product.business_id, v_name, v_phone, v_email, 'Service enrolment')
    returning id into v_customer;
  else
    update public.customers
    set name = coalesce(nullif(name, ''), v_name),
        phone = coalesce(phone, v_phone),
        email = coalesce(email, v_email)
    where id = v_customer;
  end if;

  insert into public.service_enrollments (
    business_id, product_id, customer_id, full_name, email, phone, status
  ) values (
    v_product.business_id, p_product_id, v_customer, v_name, v_email, v_phone, 'requested'
  ) returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.enroll_in_service(uuid, text, text, text) to anon, authenticated;

create or replace view public.public_business_products as
select
  p.id,
  p.business_id,
  p.name,
  p.kind,
  coalesce(nullif(p.description, ''), p.notes) as description,
  p.sale_price,
  p.unit,
  p.image_url,
  p.extra_image_urls,
  p.video_url,
  p.attributes,
  p.variants,
  p.currency,
  p.catalogue_category,
  p.service_type,
  p.starts_on,
  p.ends_on,
  p.created_at,
  p.updated_at,
  (p.kind = 'service' or p.stock_quantity > 0) as is_available,
  p.stock_quantity,
  b.is_informal,
  b.business_name,
  b.public_slug as business_slug,
  b.logo_url as business_logo_url,
  coalesce(p.catalogue_category, c.name) as category_name
from public.products p
join public.businesses b on b.id = p.business_id
left join public.business_categories c on c.id = b.category_id
where p.is_active
  and coalesce(p.is_published, true)
  and p.sale_price is not null
  and coalesce(b.moderation_status::text, 'pending') not in ('flagged', 'suspended');

grant select on public.public_business_products to anon, authenticated;

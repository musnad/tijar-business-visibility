-- TIJAR Phase 0: foundation schema + RLS skeleton
-- Apply via Supabase CLI: supabase db push

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.onboarding_status as enum (
  'not_started',
  'in_progress',
  'completed'
);

create type public.verification_status as enum (
  'not_started',
  'in_progress',
  'submitted',
  'under_review',
  'verified',
  'rejected',
  'requires_update'
);

create type public.platform_role as enum (
  'admin',
  'content_manager',
  'shariah_reviewer'
);

create type public.business_member_role as enum (
  'owner',
  'staff'
);

create type public.business_stage as enum (
  'idea',
  'starting',
  'operating',
  'growing',
  'established'
);

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  preferred_language text not null default 'en',
  onboarding_status public.onboarding_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.platform_role not null,
  created_at timestamptz not null default now(),
  unique (profile_id, role)
);

create table public.business_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.business_categories (id) on delete set null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  business_name text not null,
  category_id uuid references public.business_categories (id),
  subcategory_id uuid references public.business_categories (id),
  description text,
  location text,
  years_in_business int,
  employee_count int,
  business_stage public.business_stage,
  operating_mode text,
  islamic_mode_enabled boolean not null default false,
  verification_status public.verification_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.business_member_role not null default 'owner',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (business_id, profile_id)
);

create table public.business_dna (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  business_model text,
  revenue_models text[] not null default '{}',
  customer_types text[] not null default '{}',
  payment_methods text[] not null default '{}',
  customer_credit_enabled boolean,
  supplier_credit_enabled boolean,
  inventory_required boolean,
  has_staff boolean,
  record_keeping_methods text[] not null default '{}',
  discovery_channels text[] not null default '{}',
  goals text[] not null default '{}',
  dna_version int not null default 1,
  last_event_at timestamptz,
  traits jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  current_step text not null default 'welcome',
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index business_events_business_created_idx
  on public.business_events (business_id, created_at desc);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  business_id uuid references public.businesses (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

create trigger onboarding_sessions_updated_at
  before update on public.onboarding_sessions
  for each row execute function public.set_updated_at();

-- RLS helpers
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_id = auth.uid() limit 1;
$$;

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
  );
$$;

create or replace function public.has_platform_role(p_role public.platform_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_roles pr
    where pr.profile_id = public.current_profile_id()
      and pr.role = p_role
  );
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.platform_roles enable row level security;
alter table public.business_categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_dna enable row level security;
alter table public.onboarding_sessions enable row level security;
alter table public.business_events enable row level security;
alter table public.audit_events enable row level security;

-- Policies: profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (auth_id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (auth_id = auth.uid());

-- Policies: categories (read all active)
create policy "categories_select_active"
  on public.business_categories for select
  using (active = true);

-- Policies: businesses
create policy "businesses_select_member"
  on public.businesses for select
  using (public.is_business_member(id) or owner_id = public.current_profile_id());

create policy "businesses_insert_owner"
  on public.businesses for insert
  with check (owner_id = public.current_profile_id());

create policy "businesses_update_member"
  on public.businesses for update
  using (public.is_business_member(id));

-- Policies: business_members
create policy "members_select_same_business"
  on public.business_members for select
  using (public.is_business_member(business_id));

create policy "members_insert_owner"
  on public.business_members for insert
  with check (
    profile_id = public.current_profile_id()
    and role = 'owner'
  );

-- Policies: business_dna
create policy "dna_select_member"
  on public.business_dna for select
  using (public.is_business_member(business_id));

create policy "dna_insert_member"
  on public.business_dna for insert
  with check (public.is_business_member(business_id));

create policy "dna_update_member"
  on public.business_dna for update
  using (public.is_business_member(business_id));

-- Policies: onboarding
create policy "onboarding_select_own"
  on public.onboarding_sessions for select
  using (profile_id = public.current_profile_id());

create policy "onboarding_insert_own"
  on public.onboarding_sessions for insert
  with check (profile_id = public.current_profile_id());

create policy "onboarding_update_own"
  on public.onboarding_sessions for update
  using (profile_id = public.current_profile_id());

-- Policies: events & audit (members read; insert via service role / future RPC)
create policy "business_events_select_member"
  on public.business_events for select
  using (public.is_business_member(business_id));

create policy "audit_select_member"
  on public.audit_events for select
  using (
    business_id is null
    or public.is_business_member(business_id)
  );

-- Platform roles: self read only (admin management via service role)
create policy "platform_roles_select_self"
  on public.platform_roles for select
  using (profile_id = public.current_profile_id());

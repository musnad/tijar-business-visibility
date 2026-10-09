-- Phase 3: business health snapshots + rules-based recommendations

create type public.health_band as enum ('strong', 'stable', 'watch', 'risk');

create table public.business_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  period_days int not null default 30,
  total_sales numeric(18, 2) not null default 0,
  total_expenses numeric(18, 2) not null default 0,
  profit numeric(18, 2) not null default 0,
  customer_credit_total numeric(18, 2) not null default 0,
  supplier_credit_total numeric(18, 2) not null default 0,
  transactions_in_period int not null default 0,
  health_score smallint not null check (health_score between 0 and 100),
  health_band public.health_band not null,
  computed_at timestamptz not null default now()
);

create index business_health_snapshots_business_idx
  on public.business_health_snapshots (business_id, computed_at desc);

create table public.business_recommendations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  code text not null,
  title text not null,
  body text not null,
  priority smallint not null default 50,
  action_path text,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_recommendations_code_not_empty check (char_length(trim(code)) > 0),
  unique (business_id, code)
);

create index business_recommendations_active_idx
  on public.business_recommendations (business_id, priority desc)
  where dismissed_at is null;

create trigger business_recommendations_updated_at
  before update on public.business_recommendations
  for each row execute function public.set_updated_at();

alter table public.business_health_snapshots enable row level security;
alter table public.business_recommendations enable row level security;

create policy "health_snapshots_select_member"
  on public.business_health_snapshots for select
  using (public.is_business_member(business_id));

create policy "health_snapshots_insert_member"
  on public.business_health_snapshots for insert
  with check (public.is_business_member(business_id));

create policy "recommendations_select_member"
  on public.business_recommendations for select
  using (public.is_business_member(business_id));

create policy "recommendations_insert_member"
  on public.business_recommendations for insert
  with check (public.is_business_member(business_id));

create policy "recommendations_update_member"
  on public.business_recommendations for update
  using (public.is_business_member(business_id));

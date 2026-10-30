-- Product likes, people-follow-people, and shop owners can see who follows them.

create table if not exists public.product_likes (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, product_id)
);

alter table public.product_likes enable row level security;

drop policy if exists "product_likes_select_own" on public.product_likes;
create policy "product_likes_select_own"
  on public.product_likes for select
  using (profile_id = public.current_profile_id());

drop policy if exists "product_likes_ins" on public.product_likes;
create policy "product_likes_ins"
  on public.product_likes for insert
  with check (profile_id = public.current_profile_id());

drop policy if exists "product_likes_del" on public.product_likes;
create policy "product_likes_del"
  on public.product_likes for delete
  using (profile_id = public.current_profile_id());

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.profile_follows enable row level security;

drop policy if exists "profile_follows_select" on public.profile_follows;
create policy "profile_follows_select"
  on public.profile_follows for select
  using (
    follower_id = public.current_profile_id()
    or followee_id = public.current_profile_id()
  );

drop policy if exists "profile_follows_ins" on public.profile_follows;
create policy "profile_follows_ins"
  on public.profile_follows for insert
  with check (follower_id = public.current_profile_id());

drop policy if exists "profile_follows_del" on public.profile_follows;
create policy "profile_follows_del"
  on public.profile_follows for delete
  using (follower_id = public.current_profile_id());

drop policy if exists "follows_select_own" on public.business_follows;
drop policy if exists "follows_select_shop_team" on public.business_follows;
create policy "follows_select_shop_team"
  on public.business_follows for select
  using (
    profile_id = public.current_profile_id()
    or exists (
      select 1 from public.businesses b
      where b.id = business_follows.business_id
        and b.owner_id = public.current_profile_id()
    )
  );

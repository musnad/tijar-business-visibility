-- Phase 4: seller dashboard, staff capabilities, video jobs, genuine analytics.

do $$ begin
  alter type public.video_post_status add value if not exists 'draft';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.video_post_status add value if not exists 'failed';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.feed_event_kind add value if not exists 'impression';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.feed_event_kind add value if not exists 'enquiry';
exception when duplicate_object then null;
end $$;

alter table public.video_posts
  add column if not exists rejection_reason text,
  add column if not exists rights_attested_at timestamptz,
  add column if not exists processing_error text;

alter table public.business_enquiries
  add column if not exists seller_reply text,
  add column if not exists replied_at timestamptz;

create table if not exists public.video_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  video_post_id uuid not null references public.video_posts (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null default 'prepare' check (kind in ('prepare', 'transcode', 'thumbnail')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_jobs_video_idx on public.video_processing_jobs (video_post_id, created_at desc);

alter table public.video_processing_jobs enable row level security;

create or replace function public.has_business_capability(p_business_id uuid, p_capability text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.business_member_role;
  v_perms jsonb;
begin
  if public.has_platform_role('admin') then
    return true;
  end if;
  if exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_id = public.current_profile_id()
  ) then
    return true;
  end if;
  select bm.role, bm.permissions into v_role, v_perms
  from public.business_members bm
  where bm.business_id = p_business_id
    and bm.profile_id = public.current_profile_id();
  if v_role is null then
    return false;
  end if;
  if v_role = 'owner' then
    return true;
  end if;
  if p_capability = 'manage_staff' then
    return coalesce((v_perms->>'manage_staff')::boolean, false);
  end if;
  if v_perms ? p_capability then
    return coalesce((v_perms->>p_capability)::boolean, false);
  end if;
  -- Default staff: catalogue, videos, analytics, orders — not staff admin.
  return p_capability in ('manage_products', 'publish_videos', 'view_analytics', 'manage_orders');
end;
$$;

grant execute on function public.has_business_capability(uuid, text) to authenticated;

drop policy if exists "video_jobs_member_select" on public.video_processing_jobs;
create policy "video_jobs_member_select"
  on public.video_processing_jobs for select
  using (public.has_business_capability(business_id, 'publish_videos'));

drop policy if exists "video_jobs_member_write" on public.video_processing_jobs;
create policy "video_jobs_member_write"
  on public.video_processing_jobs for all
  using (public.has_business_capability(business_id, 'publish_videos'))
  with check (public.has_business_capability(business_id, 'publish_videos'));

drop policy if exists "feed_events_seller_select" on public.feed_events;
create policy "feed_events_seller_select"
  on public.feed_events for select
  using (
    exists (
      select 1 from public.video_posts v
      where v.id = video_post_id
        and public.has_business_capability(v.business_id, 'view_analytics')
    )
  );

create or replace function public.business_content_analytics(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_out jsonb;
begin
  if not public.has_business_capability(p_business_id, 'view_analytics') then
    raise exception 'Not allowed';
  end if;

  select jsonb_build_object(
    'impressions', (
      select count(*) from public.feed_events e
      join public.video_posts v on v.id = e.video_post_id
      where v.business_id = p_business_id and e.kind::text = 'impression'
    ),
    'qualified_views', (
      select count(*) from public.feed_events e
      join public.video_posts v on v.id = e.video_post_id
      where v.business_id = p_business_id and e.kind = 'view'
    ),
    'completes', (
      select count(*) from public.feed_events e
      join public.video_posts v on v.id = e.video_post_id
      where v.business_id = p_business_id and e.kind = 'complete'
    ),
    'likes', (
      select count(*) from public.video_likes l
      join public.video_posts v on v.id = l.video_post_id
      where v.business_id = p_business_id
    ),
    'saves', (
      select count(*) from public.video_saves s
      join public.video_posts v on v.id = s.video_post_id
      where v.business_id = p_business_id
    ),
    'shares', (
      select count(*) from public.feed_events e
      join public.video_posts v on v.id = e.video_post_id
      where v.business_id = p_business_id and e.kind = 'share'
    ),
    'product_clicks', (
      select count(*) from public.feed_events e
      join public.video_posts v on v.id = e.video_post_id
      where v.business_id = p_business_id and e.kind = 'product_tap'
    ),
    'enquiries', (
      select count(*) from public.business_enquiries q
      where q.business_id = p_business_id
    ),
    'order_requests', (
      select count(*) from public.orders o
      where o.business_id = p_business_id
    ),
    'confirmed_orders', (
      select count(*) from public.orders o
      where o.business_id = p_business_id
        and o.status in ('paid', 'confirmed', 'processing', 'shipped', 'ready_for_pickup', 'delivered')
    ),
    'attributed_orders', (
      select count(distinct o.id)
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      join public.video_post_products vp on vp.product_id = oi.product_id
      join public.video_posts v on v.id = vp.video_post_id
      where o.business_id = p_business_id
        and v.business_id = p_business_id
        and o.status in ('paid', 'confirmed', 'processing', 'shipped', 'ready_for_pickup', 'delivered')
    ),
    'video_counts', (
      select jsonb_build_object(
        'draft', count(*) filter (where status::text in ('draft', 'uploading')),
        'processing', count(*) filter (where status::text = 'processing'),
        'pending_moderation', count(*) filter (
          where status::text = 'ready' and moderation_status = 'pending'
        ),
        'published', count(*) filter (
          where status::text = 'ready' and moderation_status = 'approved' and published_at is not null
        ),
        'rejected', count(*) filter (where status::text = 'rejected' or moderation_status in ('flagged', 'suspended')),
        'failed', count(*) filter (where status::text = 'failed')
      )
      from public.video_posts
      where business_id = p_business_id
    )
  ) into v_out;

  return v_out;
end;
$$;

grant execute on function public.business_content_analytics(uuid) to authenticated;

create or replace function public.invite_business_staff(
  p_business_id uuid,
  p_email text,
  p_permissions jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid;
  v_id uuid;
begin
  if not public.has_business_capability(p_business_id, 'manage_staff') then
    raise exception 'Only owners can manage staff';
  end if;
  select id into v_profile from public.profiles where lower(email) = lower(trim(p_email)) limit 1;
  if v_profile is null then
    raise exception 'No TIJAR account with that email';
  end if;
  insert into public.business_members (business_id, profile_id, role, permissions)
  values (p_business_id, v_profile, 'staff', coalesce(p_permissions, '{}'::jsonb))
  on conflict (business_id, profile_id) do update
    set permissions = excluded.permissions
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.invite_business_staff(uuid, text, jsonb) to authenticated;

-- Public shopper feed still includes pending videos (Phase 2 policy) until a
-- moderator flags or suspends the post. Seller dashboard treats pending as
-- "pending moderation" and only counts published when approved + published_at.
-- Unique impression index is in 000022 — enum labels cannot be used in an
-- index predicate in the same transaction as ALTER TYPE ... ADD VALUE.

create or replace function public.record_feed_event(p_video_id uuid, p_kind public.feed_event_kind)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind = 'view' then
    perform public.record_video_view(p_video_id);
    return;
  end if;
  begin
    insert into public.feed_events (profile_id, video_post_id, kind)
    values (public.current_profile_id(), p_video_id, p_kind);
  exception when unique_violation then
    null;
  end;
end;
$$;

grant execute on function public.record_feed_event(uuid, public.feed_event_kind) to authenticated, anon;

drop policy if exists "products_insert_member" on public.products;
create policy "products_insert_member"
  on public.products for insert
  with check (public.has_business_capability(business_id, 'manage_products'));

drop policy if exists "products_update_member" on public.products;
create policy "products_update_member"
  on public.products for update
  using (public.has_business_capability(business_id, 'manage_products'));

drop policy if exists "products_delete_member" on public.products;
create policy "products_delete_member"
  on public.products for delete
  using (public.has_business_capability(business_id, 'manage_products'));

drop policy if exists "video_posts_member_insert" on public.video_posts;
create policy "video_posts_member_insert"
  on public.video_posts for insert
  with check (
    public.has_business_capability(business_id, 'publish_videos')
    and profile_id = public.current_profile_id()
  );

drop policy if exists "video_posts_member_update" on public.video_posts;
create policy "video_posts_member_update"
  on public.video_posts for update
  using (public.has_business_capability(business_id, 'publish_videos'));

create or replace function public.finish_video_prepare_job(p_video_id uuid)
returns public.video_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.video_posts%rowtype;
begin
  select * into v_post from public.video_posts where id = p_video_id;
  if v_post.id is null then
    raise exception 'Video not found';
  end if;
  if not public.has_business_capability(v_post.business_id, 'publish_videos') then
    raise exception 'Not allowed';
  end if;
  -- No transcode worker is configured. Original file remains the playback source.
  update public.video_posts
  set status = case when status::text = 'draft' then status else 'ready' end,
      processing_error = null,
      updated_at = now()
  where id = p_video_id
  returning * into v_post;

  update public.video_processing_jobs
  set status = 'succeeded', last_error = null, updated_at = now()
  where video_post_id = p_video_id and kind = 'prepare' and status in ('queued', 'running');

  return v_post;
end;
$$;

grant execute on function public.finish_video_prepare_job(uuid) to authenticated;


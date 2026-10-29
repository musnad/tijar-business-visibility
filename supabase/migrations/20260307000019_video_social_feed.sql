-- Video-first social commerce: posts, tags, likes, comments, follows, reports, blocks.
-- Engagement counts are trigger-maintained so clients cannot inflate them.

create type public.video_post_status as enum (
  'uploading', 'processing', 'ready', 'rejected', 'archived'
);

create type public.video_attribution as enum (
  'business', 'creator', 'sponsored', 'ai_assisted'
);

create type public.feed_event_kind as enum (
  'view', 'complete', 'product_tap', 'add_to_cart', 'share', 'like'
);

create type public.video_report_reason as enum (
  'spam', 'scam', 'hate', 'sexual', 'violence', 'other'
);

create table if not exists public.video_posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  caption text,
  captions_url text,
  cover_path text,
  storage_path text not null,
  playback_url text,
  duration_ms integer check (duration_ms is null or (duration_ms > 0 and duration_ms <= 180000)),
  width integer,
  height integer,
  status public.video_post_status not null default 'processing',
  moderation_status public.listing_moderation_status not null default 'pending',
  attribution public.video_attribution not null default 'business',
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  save_count integer not null default 0 check (save_count >= 0),
  view_count integer not null default 0 check (view_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_posts_feed_idx
  on public.video_posts (status, moderation_status, published_at desc)
  where status = 'ready';

create index if not exists video_posts_business_idx
  on public.video_posts (business_id, created_at desc);

create table if not exists public.video_post_products (
  video_post_id uuid not null references public.video_posts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (video_post_id, product_id)
);

create table if not exists public.video_likes (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  video_post_id uuid not null references public.video_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, video_post_id)
);

create table if not exists public.video_saves (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  video_post_id uuid not null references public.video_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, video_post_id)
);

create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_post_id uuid not null references public.video_posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.video_comments (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists video_comments_post_idx
  on public.video_comments (video_post_id, created_at);

create table if not exists public.business_follows (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, business_id)
);

create table if not exists public.account_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_profile_id),
  check (blocker_id <> blocked_profile_id)
);

create table if not exists public.account_mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_profile_id),
  check (muter_id <> muted_profile_id)
);

create table if not exists public.video_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  video_post_id uuid references public.video_posts (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  reason public.video_report_reason not null,
  details text,
  created_at timestamptz not null default now()
);

create unique index if not exists video_reports_once_video
  on public.video_reports (reporter_id, video_post_id)
  where video_post_id is not null;

create table if not exists public.feed_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  video_post_id uuid not null references public.video_posts (id) on delete cascade,
  kind public.feed_event_kind not null,
  created_at timestamptz not null default now()
);

-- date_trunc(timestamptz) is STABLE, so it cannot be used in an index expression.
-- One counted view per signed-in profile per video (RPC ignores unique_violation).
create unique index if not exists feed_events_view_once
  on public.feed_events (profile_id, video_post_id)
  where kind = 'view' and profile_id is not null;

create index if not exists feed_events_video_idx
  on public.feed_events (video_post_id, kind, created_at desc);

-- Same-business product tags only.
create or replace function public.video_post_products_same_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_biz uuid;
  p_biz uuid;
begin
  select business_id into v_biz from public.video_posts where id = new.video_post_id;
  select business_id into p_biz from public.products where id = new.product_id;
  if v_biz is null or p_biz is null or v_biz is distinct from p_biz then
    raise exception 'Product must belong to the same business as the video';
  end if;
  return new;
end;
$$;

drop trigger if exists video_post_products_biz_trg on public.video_post_products;
create trigger video_post_products_biz_trg
  before insert or update on public.video_post_products
  for each row execute function public.video_post_products_same_business();

create or replace function public.touch_video_posts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists video_posts_touch on public.video_posts;
create trigger video_posts_touch
  before update on public.video_posts
  for each row execute function public.touch_video_posts_updated_at();

create or replace function public.video_like_count_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.video_posts set like_count = like_count + 1 where id = new.video_post_id;
    return new;
  end if;
  update public.video_posts set like_count = greatest(0, like_count - 1) where id = old.video_post_id;
  return old;
end;
$$;

drop trigger if exists video_likes_count_ins on public.video_likes;
create trigger video_likes_count_ins after insert on public.video_likes
  for each row execute function public.video_like_count_sync();
drop trigger if exists video_likes_count_del on public.video_likes;
create trigger video_likes_count_del after delete on public.video_likes
  for each row execute function public.video_like_count_sync();

create or replace function public.video_save_count_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.video_posts set save_count = save_count + 1 where id = new.video_post_id;
    return new;
  end if;
  update public.video_posts set save_count = greatest(0, save_count - 1) where id = old.video_post_id;
  return old;
end;
$$;

drop trigger if exists video_saves_count_ins on public.video_saves;
create trigger video_saves_count_ins after insert on public.video_saves
  for each row execute function public.video_save_count_sync();
drop trigger if exists video_saves_count_del on public.video_saves;
create trigger video_saves_count_del after delete on public.video_saves
  for each row execute function public.video_save_count_sync();

create or replace function public.video_comment_count_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.video_posts set comment_count = comment_count + 1 where id = new.video_post_id;
    return new;
  end if;
  update public.video_posts set comment_count = greatest(0, comment_count - 1) where id = old.video_post_id;
  return old;
end;
$$;

drop trigger if exists video_comments_count_ins on public.video_comments;
create trigger video_comments_count_ins after insert on public.video_comments
  for each row execute function public.video_comment_count_sync();
drop trigger if exists video_comments_count_del on public.video_comments;
create trigger video_comments_count_del after delete on public.video_comments
  for each row execute function public.video_comment_count_sync();

create or replace function public.record_video_view(p_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid := public.current_profile_id();
begin
  insert into public.feed_events (profile_id, video_post_id, kind)
  values (v_profile, p_video_id, 'view');
  update public.video_posts
    set view_count = view_count + 1
    where id = p_video_id and status = 'ready';
exception
  when unique_violation then
    null;
end;
$$;

grant execute on function public.record_video_view(uuid) to authenticated, anon;

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
  insert into public.feed_events (profile_id, video_post_id, kind)
  values (public.current_profile_id(), p_video_id, p_kind);
end;
$$;

grant execute on function public.record_feed_event(uuid, public.feed_event_kind) to authenticated, anon;

create or replace view public.public_video_feed as
select
  v.id,
  v.business_id,
  v.profile_id,
  v.caption,
  v.captions_url,
  v.cover_path,
  v.playback_url,
  v.storage_path,
  v.duration_ms,
  v.attribution,
  v.like_count,
  v.comment_count,
  v.save_count,
  v.view_count,
  v.published_at,
  v.created_at,
  b.slug,
  b.business_name,
  b.logo_url as business_logo_url,
  b.is_verified,
  b.verification_status,
  b.category_id,
  b.category_name,
  coalesce(
    (
      select array_agg(vp.product_id order by vp.sort_order)
      from public.video_post_products vp
      where vp.video_post_id = v.id
    ),
    '{}'::uuid[]
  ) as product_ids
from public.video_posts v
join public.public_marketplace_businesses b on b.id = v.business_id
where v.status = 'ready'
  and v.moderation_status in ('approved', 'pending');

grant select on public.public_video_feed to anon, authenticated;

alter table public.video_posts enable row level security;
alter table public.video_post_products enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_saves enable row level security;
alter table public.video_comments enable row level security;
alter table public.business_follows enable row level security;
alter table public.account_blocks enable row level security;
alter table public.account_mutes enable row level security;
alter table public.video_reports enable row level security;
alter table public.feed_events enable row level security;

create policy "video_posts_public_ready"
  on public.video_posts for select
  using (
    status = 'ready'
    or public.is_business_member(business_id)
    or public.has_platform_role('admin')
  );

create policy "video_posts_member_insert"
  on public.video_posts for insert
  with check (
    public.is_business_member(business_id)
    and profile_id = public.current_profile_id()
  );

create policy "video_posts_member_update"
  on public.video_posts for update
  using (public.is_business_member(business_id) or public.has_platform_role('admin'));

create policy "video_products_select"
  on public.video_post_products for select
  using (true);

create policy "video_products_member"
  on public.video_post_products for insert
  with check (
    exists (
      select 1 from public.video_posts v
      where v.id = video_post_id and public.is_business_member(v.business_id)
    )
  );

create policy "video_products_member_del"
  on public.video_post_products for delete
  using (
    exists (
      select 1 from public.video_posts v
      where v.id = video_post_id and public.is_business_member(v.business_id)
    )
  );

create policy "video_likes_select"
  on public.video_likes for select
  using (profile_id = public.current_profile_id());

create policy "video_likes_own"
  on public.video_likes for insert
  with check (profile_id = public.current_profile_id());

create policy "video_likes_own_del"
  on public.video_likes for delete
  using (profile_id = public.current_profile_id());

create policy "video_saves_own"
  on public.video_saves for select
  using (profile_id = public.current_profile_id());

create policy "video_saves_ins"
  on public.video_saves for insert
  with check (profile_id = public.current_profile_id());

create policy "video_saves_del"
  on public.video_saves for delete
  using (profile_id = public.current_profile_id());

create policy "video_comments_select"
  on public.video_comments for select
  using (true);

create policy "video_comments_ins"
  on public.video_comments for insert
  with check (profile_id = public.current_profile_id());

create policy "video_comments_del"
  on public.video_comments for delete
  using (profile_id = public.current_profile_id() or public.has_platform_role('admin'));

create policy "follows_select_own"
  on public.business_follows for select
  using (profile_id = public.current_profile_id() or public.is_business_member(business_id));

create policy "follows_ins"
  on public.business_follows for insert
  with check (profile_id = public.current_profile_id());

create policy "follows_del"
  on public.business_follows for delete
  using (profile_id = public.current_profile_id());

create policy "blocks_own"
  on public.account_blocks for all
  using (blocker_id = public.current_profile_id())
  with check (blocker_id = public.current_profile_id());

create policy "mutes_own"
  on public.account_mutes for all
  using (muter_id = public.current_profile_id())
  with check (muter_id = public.current_profile_id());

create policy "reports_own_ins"
  on public.video_reports for insert
  with check (reporter_id = public.current_profile_id());

create policy "reports_admin_select"
  on public.video_reports for select
  using (reporter_id = public.current_profile_id() or public.has_platform_role('admin'));

create policy "feed_events_ins"
  on public.feed_events for insert
  with check (profile_id is null or profile_id = public.current_profile_id());

create policy "feed_events_own"
  on public.feed_events for select
  using (profile_id = public.current_profile_id() or public.has_platform_role('admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-videos',
  'business-videos',
  true,
  83886080,
  array['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "business_videos_public_read"
  on storage.objects for select
  using (bucket_id = 'business-videos');

create policy "business_videos_member_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'business-videos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select b.id::text from public.businesses b
      inner join public.business_members m on m.business_id = b.id
      inner join public.profiles p on p.id = m.profile_id
      where p.auth_id = auth.uid()
    )
  );

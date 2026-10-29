-- Resume after 42P17. Tables/types from 000019 should already exist.
-- Safe to re-run: policies are dropped first.

create unique index if not exists feed_events_view_once
  on public.feed_events (profile_id, video_post_id)
  where kind = 'view' and profile_id is not null;

create index if not exists feed_events_video_idx
  on public.feed_events (video_post_id, kind, created_at desc);

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

drop policy if exists "video_posts_public_ready" on public.video_posts;
create policy "video_posts_public_ready"
  on public.video_posts for select
  using (
    status = 'ready'
    or public.is_business_member(business_id)
    or public.has_platform_role('admin')
  );

drop policy if exists "video_posts_member_insert" on public.video_posts;
create policy "video_posts_member_insert"
  on public.video_posts for insert
  with check (
    public.is_business_member(business_id)
    and profile_id = public.current_profile_id()
  );

drop policy if exists "video_posts_member_update" on public.video_posts;
create policy "video_posts_member_update"
  on public.video_posts for update
  using (public.is_business_member(business_id) or public.has_platform_role('admin'));

drop policy if exists "video_products_select" on public.video_post_products;
create policy "video_products_select"
  on public.video_post_products for select
  using (true);

drop policy if exists "video_products_member" on public.video_post_products;
create policy "video_products_member"
  on public.video_post_products for insert
  with check (
    exists (
      select 1 from public.video_posts v
      where v.id = video_post_id and public.is_business_member(v.business_id)
    )
  );

drop policy if exists "video_products_member_del" on public.video_post_products;
create policy "video_products_member_del"
  on public.video_post_products for delete
  using (
    exists (
      select 1 from public.video_posts v
      where v.id = video_post_id and public.is_business_member(v.business_id)
    )
  );

drop policy if exists "video_likes_select" on public.video_likes;
create policy "video_likes_select"
  on public.video_likes for select
  using (profile_id = public.current_profile_id());

drop policy if exists "video_likes_own" on public.video_likes;
create policy "video_likes_own"
  on public.video_likes for insert
  with check (profile_id = public.current_profile_id());

drop policy if exists "video_likes_own_del" on public.video_likes;
create policy "video_likes_own_del"
  on public.video_likes for delete
  using (profile_id = public.current_profile_id());

drop policy if exists "video_saves_own" on public.video_saves;
create policy "video_saves_own"
  on public.video_saves for select
  using (profile_id = public.current_profile_id());

drop policy if exists "video_saves_ins" on public.video_saves;
create policy "video_saves_ins"
  on public.video_saves for insert
  with check (profile_id = public.current_profile_id());

drop policy if exists "video_saves_del" on public.video_saves;
create policy "video_saves_del"
  on public.video_saves for delete
  using (profile_id = public.current_profile_id());

drop policy if exists "video_comments_select" on public.video_comments;
create policy "video_comments_select"
  on public.video_comments for select
  using (true);

drop policy if exists "video_comments_ins" on public.video_comments;
create policy "video_comments_ins"
  on public.video_comments for insert
  with check (profile_id = public.current_profile_id());

drop policy if exists "video_comments_del" on public.video_comments;
create policy "video_comments_del"
  on public.video_comments for delete
  using (profile_id = public.current_profile_id() or public.has_platform_role('admin'));

drop policy if exists "follows_select_own" on public.business_follows;
create policy "follows_select_own"
  on public.business_follows for select
  using (profile_id = public.current_profile_id() or public.is_business_member(business_id));

drop policy if exists "follows_ins" on public.business_follows;
create policy "follows_ins"
  on public.business_follows for insert
  with check (profile_id = public.current_profile_id());

drop policy if exists "follows_del" on public.business_follows;
create policy "follows_del"
  on public.business_follows for delete
  using (profile_id = public.current_profile_id());

drop policy if exists "blocks_own" on public.account_blocks;
create policy "blocks_own"
  on public.account_blocks for all
  using (blocker_id = public.current_profile_id())
  with check (blocker_id = public.current_profile_id());

drop policy if exists "mutes_own" on public.account_mutes;
create policy "mutes_own"
  on public.account_mutes for all
  using (muter_id = public.current_profile_id())
  with check (muter_id = public.current_profile_id());

drop policy if exists "reports_own_ins" on public.video_reports;
create policy "reports_own_ins"
  on public.video_reports for insert
  with check (reporter_id = public.current_profile_id());

drop policy if exists "reports_admin_select" on public.video_reports;
create policy "reports_admin_select"
  on public.video_reports for select
  using (reporter_id = public.current_profile_id() or public.has_platform_role('admin'));

drop policy if exists "feed_events_ins" on public.feed_events;
create policy "feed_events_ins"
  on public.feed_events for insert
  with check (profile_id is null or profile_id = public.current_profile_id());

drop policy if exists "feed_events_own" on public.feed_events;
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

drop policy if exists "business_videos_public_read" on storage.objects;
create policy "business_videos_public_read"
  on storage.objects for select
  using (bucket_id = 'business-videos');

drop policy if exists "business_videos_member_upload" on storage.objects;
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

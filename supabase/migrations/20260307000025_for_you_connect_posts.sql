-- Every ready shopping post appears on For You, even if the shop is informal.

alter table public.video_posts
  add column if not exists media_kind text not null default 'video',
  add column if not exists processing_error text;

alter table public.video_posts
  drop constraint if exists video_posts_media_kind_ok;
alter table public.video_posts
  add constraint video_posts_media_kind_ok
  check (media_kind in ('video', 'image'));

-- Finish posts that never left processing so they can show in the feed.
update public.video_posts
set
  status = 'ready',
  published_at = coalesce(published_at, created_at, now())
where storage_path is not null
  and status::text in ('processing', 'uploading')
  and coalesce(moderation_status::text, 'pending') not in ('flagged', 'suspended');

update public.video_posts
set published_at = coalesce(published_at, created_at, now())
where status::text = 'ready'
  and published_at is null;

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
  v.media_kind,
  v.like_count,
  v.comment_count,
  v.save_count,
  v.view_count,
  v.published_at,
  v.created_at,
  coalesce(b.public_slug, v.business_id::text) as slug,
  b.business_name,
  b.logo_url as business_logo_url,
  (b.verification_status = 'verified') as is_verified,
  b.verification_status,
  b.category_id,
  c.name as category_name,
  coalesce(
    (
      select array_agg(vp.product_id order by vp.sort_order)
      from public.video_post_products vp
      where vp.video_post_id = v.id
    ),
    '{}'::uuid[]
  ) as product_ids
from public.video_posts v
join public.businesses b on b.id = v.business_id
left join public.business_categories c on c.id = b.category_id
where v.status::text = 'ready'
  and coalesce(v.moderation_status::text, 'pending') not in ('flagged', 'suspended')
  and coalesce(b.moderation_status::text, 'pending') not in ('flagged', 'suspended');

grant select on public.public_video_feed to anon, authenticated;

do $$
begin
  alter view public.public_video_feed set (security_invoker = false);
exception
  when others then
    null;
end $$;

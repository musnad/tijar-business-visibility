-- Shopping posts can be a photo or a video.

alter table public.video_posts
  add column if not exists media_kind text not null default 'video';

alter table public.video_posts
  drop constraint if exists video_posts_media_kind_ok;
alter table public.video_posts
  add constraint video_posts_media_kind_ok
  check (media_kind in ('video', 'image'));

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

update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'business-videos';

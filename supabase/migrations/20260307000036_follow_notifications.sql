-- Shop/person follows stay visible on both sides, and follow/comment activity is delivered in-app.

drop policy if exists "follows_select_shop_team" on public.business_follows;
create policy "follows_select_shop_team"
  on public.business_follows for select
  using (
    profile_id = public.current_profile_id()
    or public.is_business_member(business_id)
    or exists (
      select 1 from public.businesses b
      where b.id = business_follows.business_id
        and b.owner_id = public.current_profile_id()
    )
  );

drop policy if exists "profiles_select_social" on public.profiles;
create policy "profiles_select_social"
  on public.profiles for select
  using (
    id = public.current_profile_id()
    or exists (
      select 1
      from public.business_follows f
      join public.businesses b on b.id = f.business_id
      where (f.profile_id = profiles.id and (b.owner_id = public.current_profile_id() or public.is_business_member(b.id)))
         or (f.profile_id = public.current_profile_id() and b.owner_id = profiles.id)
    )
    or exists (
      select 1 from public.profile_follows pf
      where (pf.follower_id = public.current_profile_id() and pf.followee_id = profiles.id)
         or (pf.followee_id = public.current_profile_id() and pf.follower_id = profiles.id)
    )
  );

create table if not exists public.activity_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('follow', 'follow_back', 'comment', 'comment_reply')),
  business_id uuid references public.businesses (id) on delete cascade,
  video_post_id uuid,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists activity_notifications_inbox_idx
  on public.activity_notifications (recipient_id, created_at desc);

create index if not exists activity_notifications_unread_idx
  on public.activity_notifications (recipient_id)
  where read_at is null;

alter table public.activity_notifications enable row level security;

drop policy if exists "activity_notifications_select_own" on public.activity_notifications;
create policy "activity_notifications_select_own"
  on public.activity_notifications for select
  using (recipient_id = public.current_profile_id());

drop policy if exists "activity_notifications_update_own" on public.activity_notifications;
create policy "activity_notifications_update_own"
  on public.activity_notifications for update
  using (recipient_id = public.current_profile_id())
  with check (recipient_id = public.current_profile_id());

create or replace function public.notify_activity(
  p_recipient uuid,
  p_actor uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_business_id uuid default null,
  p_video_post_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient is null or p_actor is null or p_recipient = p_actor then
    return;
  end if;
  insert into public.activity_notifications (
    recipient_id, actor_id, kind, business_id, video_post_id, title, body
  ) values (
    p_recipient, p_actor, p_kind, p_business_id, p_video_post_id, p_title, p_body
  );
end;
$$;

grant execute on function public.notify_activity(uuid, uuid, text, text, text, uuid, uuid) to authenticated;

create or replace function public.trg_notify_shop_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_shop text;
  v_actor text;
  v_back boolean := false;
begin
  select owner_id, business_name into v_owner, v_shop
  from public.businesses where id = new.business_id;
  select full_name into v_actor from public.profiles where id = new.profile_id;
  if v_owner is null then
    return new;
  end if;

  select exists (
    select 1
    from public.business_follows f
    join public.businesses b on b.id = f.business_id
    where f.profile_id = v_owner
      and b.owner_id = new.profile_id
  ) or exists (
    select 1 from public.profile_follows pf
    where pf.follower_id = v_owner and pf.followee_id = new.profile_id
  ) into v_back;

  perform public.notify_activity(
    v_owner,
    new.profile_id,
    case when v_back then 'follow_back' else 'follow' end,
    case when v_back then 'Followed you back' else 'New follower' end,
    case when v_back
      then coalesce(nullif(btrim(v_actor), ''), 'Someone') || ' followed you back'
      else coalesce(nullif(btrim(v_actor), ''), 'Someone') || ' started following ' || coalesce(v_shop, 'your shop')
    end,
    new.business_id,
    null
  );
  return new;
end;
$$;

drop trigger if exists business_follows_notify on public.business_follows;
create trigger business_follows_notify
  after insert on public.business_follows
  for each row execute function public.trg_notify_shop_follow();

create or replace function public.trg_notify_profile_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
  v_back boolean := false;
begin
  select full_name into v_actor from public.profiles where id = new.follower_id;
  select exists (
    select 1 from public.profile_follows pf
    where pf.follower_id = new.followee_id and pf.followee_id = new.follower_id
  ) into v_back;

  perform public.notify_activity(
    new.followee_id,
    new.follower_id,
    case when v_back then 'follow_back' else 'follow' end,
    case when v_back then 'Followed you back' else 'New follower' end,
    case when v_back
      then coalesce(nullif(btrim(v_actor), ''), 'Someone') || ' followed you back'
      else coalesce(nullif(btrim(v_actor), ''), 'Someone') || ' started following you'
    end,
    null,
    null
  );
  return new;
end;
$$;

drop trigger if exists profile_follows_notify on public.profile_follows;
create trigger profile_follows_notify
  after insert on public.profile_follows
  for each row execute function public.trg_notify_profile_follow();

create or replace function public.trg_notify_video_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_owner uuid;
  v_business uuid;
  v_actor text;
  v_parent uuid;
begin
  select vp.profile_id, vp.business_id, b.owner_id
    into v_author, v_business, v_owner
  from public.video_posts vp
  left join public.businesses b on b.id = vp.business_id
  where vp.id = new.video_post_id;

  select full_name into v_actor from public.profiles where id = new.profile_id;

  perform public.notify_activity(
    v_author,
    new.profile_id,
    'comment',
    'New comment',
    coalesce(nullif(btrim(v_actor), ''), 'Someone') || ' commented: ' || left(new.body, 120),
    v_business,
    new.video_post_id
  );

  if v_owner is not null and v_owner is distinct from v_author then
    perform public.notify_activity(
      v_owner,
      new.profile_id,
      'comment',
      'New comment on your shop',
      coalesce(nullif(btrim(v_actor), ''), 'Someone') || ' commented on a post',
      v_business,
      new.video_post_id
    );
  end if;

  if new.parent_id is not null then
    select profile_id into v_parent from public.video_comments where id = new.parent_id;
    perform public.notify_activity(
      v_parent,
      new.profile_id,
      'comment_reply',
      'New reply',
      coalesce(nullif(btrim(v_actor), ''), 'Someone') || ' replied to your comment',
      v_business,
      new.video_post_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists video_comments_notify on public.video_comments;
create trigger video_comments_notify
  after insert on public.video_comments
  for each row execute function public.trg_notify_video_comment();

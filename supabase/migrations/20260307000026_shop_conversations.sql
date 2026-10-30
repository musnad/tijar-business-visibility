-- Customer ↔ business chat (Messages). One thread per shopper + shop.

create table if not exists public.shop_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  last_message_at timestamptz not null default now(),
  last_preview text not null default '',
  customer_last_read_at timestamptz,
  business_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, customer_id)
);

create index if not exists shop_conversations_customer_idx
  on public.shop_conversations (customer_id, last_message_at desc);
create index if not exists shop_conversations_business_idx
  on public.shop_conversations (business_id, last_message_at desc);

create table if not exists public.shop_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.shop_conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists shop_messages_thread_idx
  on public.shop_messages (conversation_id, created_at);

alter table public.shop_conversations enable row level security;
alter table public.shop_messages enable row level security;

drop policy if exists "shop_convos_select" on public.shop_conversations;
create policy "shop_convos_select"
  on public.shop_conversations for select
  to authenticated
  using (
    customer_id = public.current_profile_id()
    or public.is_business_member(business_id)
  );

drop policy if exists "shop_convos_insert" on public.shop_conversations;
create policy "shop_convos_insert"
  on public.shop_conversations for insert
  to authenticated
  with check (customer_id = public.current_profile_id());

drop policy if exists "shop_convos_update" on public.shop_conversations;
create policy "shop_convos_update"
  on public.shop_conversations for update
  to authenticated
  using (
    customer_id = public.current_profile_id()
    or public.is_business_member(business_id)
  )
  with check (
    customer_id = public.current_profile_id()
    or public.is_business_member(business_id)
  );

drop policy if exists "shop_msgs_select" on public.shop_messages;
create policy "shop_msgs_select"
  on public.shop_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.shop_conversations c
      where c.id = conversation_id
        and (
          c.customer_id = public.current_profile_id()
          or public.is_business_member(c.business_id)
        )
    )
  );

drop policy if exists "shop_msgs_insert" on public.shop_messages;
create policy "shop_msgs_insert"
  on public.shop_messages for insert
  to authenticated
  with check (
    sender_id = public.current_profile_id()
    and exists (
      select 1 from public.shop_conversations c
      where c.id = conversation_id
        and (
          c.customer_id = public.current_profile_id()
          or public.is_business_member(c.business_id)
        )
    )
  );

create or replace function public.shop_messages_touch_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shop_conversations
  set
    last_message_at = new.created_at,
    last_preview = left(new.body, 140)
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists shop_messages_touch_thread on public.shop_messages;
create trigger shop_messages_touch_thread
  after insert on public.shop_messages
  for each row execute function public.shop_messages_touch_thread();

create or replace function public.open_shop_conversation(
  p_business_id uuid,
  p_product_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.current_profile_id();
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (select 1 from public.businesses b where b.id = p_business_id) then
    raise exception 'Shop not found';
  end if;

  insert into public.shop_conversations (business_id, customer_id, product_id)
  values (p_business_id, v_me, p_product_id)
  on conflict (business_id, customer_id) do update
    set product_id = coalesce(excluded.product_id, public.shop_conversations.product_id)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.open_shop_conversation(uuid, uuid) to authenticated;

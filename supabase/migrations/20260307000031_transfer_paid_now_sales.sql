-- Buyer marks a bank transfer as paid. Seller confirms. That writes a daily sale.

alter table public.orders
  add column if not exists buyer_marked_paid_at timestamptz,
  add column if not exists sale_transaction_id uuid;

create or replace function public.buyer_mark_transfer_paid(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_profile uuid := public.current_profile_id();
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'Order not found';
  end if;
  if v_order.buyer_profile_id is distinct from v_profile then
    raise exception 'Not allowed';
  end if;
  if v_order.status is distinct from 'pending_payment' then
    raise exception 'This order is not waiting for a transfer';
  end if;
  update public.orders
  set buyer_marked_paid_at = coalesce(buyer_marked_paid_at, now()),
      updated_at = now()
  where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;

grant execute on function public.buyer_mark_transfer_paid(uuid) to authenticated;

create or replace function public.record_order_as_sale(p_order public.orders, p_profile uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx uuid;
  v_item record;
begin
  if p_order.sale_transaction_id is not null then
    return p_order.sale_transaction_id;
  end if;

  insert into public.transactions (
    business_id,
    type,
    amount,
    currency,
    payment_method,
    description,
    created_by,
    occurred_at,
    metadata
  )
  values (
    p_order.business_id,
    'sale',
    p_order.total,
    coalesce(p_order.currency, 'NGN'),
    'transfer',
    'Shop order ' || p_order.order_number,
    p_profile,
    now(),
    jsonb_build_object('order_id', p_order.id, 'order_number', p_order.order_number)
  )
  returning id into v_tx;

  for v_item in
    select * from public.order_items where order_id = p_order.id
  loop
    begin
      insert into public.stock_movements (
        business_id,
        product_id,
        quantity_delta,
        reason,
        notes,
        created_by
      )
      select
        p_order.business_id,
        v_item.product_id,
        -v_item.quantity,
        'sale',
        'Shop order ' || p_order.order_number,
        p_profile
      where v_item.product_id is not null
        and exists (
        select 1 from public.products p
        where p.id = v_item.product_id
          and p.business_id = p_order.business_id
          and p.stock_quantity >= v_item.quantity
      );
    exception
      when others then
        null;
    end;
  end loop;

  return v_tx;
end;
$$;

create or replace function public.transition_marketplace_order(
  p_order_id uuid,
  p_new_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_profile uuid := public.current_profile_id();
  v_seller boolean;
  v_buyer boolean;
  v_tx uuid;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'Order not found';
  end if;
  v_buyer := v_order.buyer_profile_id = v_profile;
  v_seller := public.is_business_member(v_order.business_id);
  if not v_buyer and not v_seller and not public.has_platform_role('admin') then
    raise exception 'Not allowed';
  end if;

  if p_new_status in ('paid', 'refunded') then
    raise exception 'Payment status can only change via a payment provider webhook';
  end if;

  if v_buyer and p_new_status = 'cancelled' and v_order.status in ('pending_payment') then
    update public.orders set status = 'cancelled', updated_at = now() where id = p_order_id returning * into v_order;
    return v_order;
  end if;

  if v_seller or public.has_platform_role('admin') then
    if v_order.status = 'pending_payment' and p_new_status = 'confirmed' then
      v_tx := public.record_order_as_sale(v_order, v_profile);
      update public.orders
      set status = 'confirmed',
          sale_transaction_id = coalesce(sale_transaction_id, v_tx),
          updated_at = now()
      where id = p_order_id
      returning * into v_order;
      return v_order;
    end if;
    if v_order.status = 'confirmed' and p_new_status = 'processing' then
      update public.orders set status = 'processing', updated_at = now() where id = p_order_id returning * into v_order;
      return v_order;
    end if;
    if v_order.status = 'processing' and p_new_status in ('shipped', 'ready_for_pickup') then
      update public.orders set status = p_new_status, updated_at = now() where id = p_order_id returning * into v_order;
      return v_order;
    end if;
    if v_order.status in ('shipped', 'ready_for_pickup', 'processing') and p_new_status = 'delivered' then
      update public.orders set status = 'delivered', updated_at = now() where id = p_order_id returning * into v_order;
      return v_order;
    end if;
    if v_order.status in ('pending_payment', 'confirmed') and p_new_status = 'cancelled' then
      update public.orders set status = 'cancelled', updated_at = now() where id = p_order_id returning * into v_order;
      return v_order;
    end if;
  end if;

  raise exception 'Invalid status transition from % to %', v_order.status, p_new_status;
end;
$$;

grant execute on function public.transition_marketplace_order(uuid, public.order_status) to authenticated;

revoke all on function public.record_order_as_sale(public.orders, uuid) from public, anon, authenticated;

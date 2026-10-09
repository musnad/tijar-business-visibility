-- Phase 1: allow members to append business events from the client
create policy "business_events_insert_member"
  on public.business_events for insert
  with check (public.is_business_member(business_id));

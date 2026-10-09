-- Allow authenticated users to permanently delete their account and owned businesses.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_profile_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select id into v_profile_id from public.profiles where auth_id = v_uid;
  if v_profile_id is null then
    raise exception 'profile_not_found';
  end if;

  delete from public.businesses where owner_id = v_profile_id;
  delete from public.profiles where id = v_profile_id;
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

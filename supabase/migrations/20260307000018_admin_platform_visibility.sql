-- Platform admin can read every ledger row needed for the console.

drop policy if exists "transactions_select_admin" on public.transactions;
create policy "transactions_select_admin"
  on public.transactions for select
  using (public.has_platform_role('admin'));

drop policy if exists "payments_select_admin" on public.payments;
create policy "payments_select_admin"
  on public.payments for select
  using (public.has_platform_role('admin'));

drop policy if exists "customers_select_admin" on public.customers;
create policy "customers_select_admin"
  on public.customers for select
  using (public.has_platform_role('admin'));

drop policy if exists "suppliers_select_admin" on public.suppliers;
create policy "suppliers_select_admin"
  on public.suppliers for select
  using (public.has_platform_role('admin'));

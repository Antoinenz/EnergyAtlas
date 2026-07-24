-- RLS policies only filter *rows*; Postgres still requires a table-level
-- GRANT before a role can run the statement at all. Supabase Studio's UI
-- adds these automatically when you create a table through the dashboard;
-- raw SQL migrations (like ours) don't get them for free, which is why
-- every query above was failing with "permission denied" even though the
-- RLS policies were correct.

grant usage on schema public to anon, authenticated;

-- Public read on everything that's meant to be browsable without an account.
grant select on public.brands to anon, authenticated;
grant select on public.flavors to anon, authenticated;
grant select on public.stores to anon, authenticated;
grant select on public.stock_reports to anon, authenticated;
grant select on public.stock_reports_with_status to anon, authenticated;
grant select on public.user_profiles to anon, authenticated;
grant select on public.reviews to anon, authenticated;

-- Writes: only for signed-in users, matching the `to authenticated` RLS
-- policies in 0001/0002. `user_profiles` has no insert grant -- that row
-- is created by the security-definer trigger on signup, not by the client.
grant insert, update on public.stores to authenticated;
grant insert, update on public.stock_reports to authenticated;
grant update on public.user_profiles to authenticated;
grant insert, update, delete on public.reviews to authenticated;

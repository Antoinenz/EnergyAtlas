-- service_role is the key used by trusted server-side jobs (seed/sync scripts,
-- edge functions). It bypasses RLS but, like any role, still needs table-level
-- grants. Our from-scratch migrations create tables owned by `postgres` without
-- granting to service_role, so writes from the sync script were denied. Grant
-- full access on everything in `public`, now and for future objects.

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

alter default privileges in schema public
    grant all on tables to service_role;
alter default privileges in schema public
    grant all on sequences to service_role;
alter default privileges in schema public
    grant all on routines to service_role;

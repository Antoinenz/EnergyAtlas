-- The partial unique index from 0004 can't back an ON CONFLICT (source,
-- source_slug) upsert: PostgREST doesn't emit the index's WHERE predicate, so
-- Postgres won't match it ("no unique or exclusion constraint matching...").
--
-- Replace it with a plain unique constraint. Postgres treats NULLs as distinct
-- by default, so the many manual/OFF rows (source = null, source_slug = null)
-- still never collide with each other -- we get idempotent upserts for synced
-- rows without constraining the manual ones.

drop index if exists flavors_source_slug_key;

alter table flavors
    add constraint flavors_source_slug_key unique (source, source_slug);
